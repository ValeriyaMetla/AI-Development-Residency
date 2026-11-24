-- A "Don't use AI for this" Co-Pilot assessment can never be approved (ADR-0036 · card "Show
-- reviewers why a Co-Pilot assessment was flagged" · decision Val 2026-11-23).
--
-- WHY: Human Review now hides Approve for these assessments (PR #128), but a hidden button doesn't
-- stop a direct call to the review step through the Data API. The rule has to live in the one
-- protected place every decision goes through: review_task_run (ADR-0028).
--
-- WHAT THIS DOES: replaces review_task_run with the same signature and behavior, plus one check
-- after "is it still waiting": if the decision is 'approved' and the run has a Co-Pilot assessment
-- with verdict 'dont' (or tier 'prohibited'), it returns the new outcome 'not_approvable' and
-- writes nothing. Rejecting is unchanged. Grants are re-stated exactly as before.
--
-- HOW TO RUN: Supabase SQL Editor → paste → Run → "Run without RLS". Apply to studio-pentest first,
-- then live. Then run supabase/checks/copilot-not-approvable-check.sql (nothing is kept).
-- The app change that understands 'not_approvable' ships in the same PR; until this migration is
-- applied, the old function simply never returns it.

create or replace function public.review_task_run(
  p_task_run_id uuid,
  p_decision public.approval_decision,
  p_note text default null,
  p_edited_output text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_status public.task_status;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_ai_label text;
begin
  -- Who is asking, and for which org.
  if v_uid is null then
    return 'not_signed_in';
  end if;
  v_org := public.current_org_id();
  if v_org is null then
    return 'not_found';
  end if;

  -- Same input limits as the app's parseReviewInput (lib/domain/approvals.ts): a direct call to
  -- this function skips the app, so the database enforces them too.
  if p_decision is null then
    return 'invalid';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    return 'invalid';
  end if;
  if p_edited_output is not null and (
       p_decision <> 'approved'
       or btrim(p_edited_output) = ''
       or char_length(p_edited_output) > 10000
     ) then
    return 'invalid';
  end if;

  -- Lock the run so two reviewers can't decide it at the same moment. Another org's run is
  -- reported exactly like a missing one (no hint that it exists).
  select tr.status
    into v_status
    from public.task_run tr
   where tr.id = p_task_run_id
     and tr.org_id = v_org
   for update;
  if not found then
    return 'not_found';
  end if;

  -- Only a flagged, undecided run can be reviewed — once (the first decision is final).
  if v_status <> 'needs_review' then
    return 'not_pending';
  end if;

  -- ADR-0036: a Co-Pilot assessment that advises against the use (verdict 'dont', tier
  -- 'prohibited') can never be approved. Rejecting ("Don't go ahead") still works. Checked here,
  -- in the one protected review step, so no caller — the app or a direct API call — can skip it.
  -- Any such assessment on the run counts, so adding another row can't undo it.
  if p_decision = 'approved' and exists (
       select 1
         from public.copilot_assessment ca
        where ca.task_run_id = p_task_run_id
          and (ca.verdict = 'dont' or ca.tier = 'prohibited')
     ) then
    return 'not_approvable';
  end if;

  -- Reviewer edit (approve only, ADR-0022): a NEW output version credited to the reviewer; the
  -- AI original is kept. The base provenance label is copied from the AI's own draft rather than
  -- taken from the caller, so a direct call can't plant a misleading label.
  if p_edited_output is not null then
    select o.provenance_label
      into v_ai_label
      from public.task_output o
     where o.task_run_id = p_task_run_id
       and o.edited_by is null
     order by o.created_at desc
     limit 1;

    insert into public.task_output (task_run_id, content, provenance_label, edited_by)
    values (p_task_run_id, p_edited_output, v_ai_label, v_uid);
  end if;

  -- The durable, attributable decision (ADR-0020).
  insert into public.approval (task_run_id, decided_by, decision, note)
  values (p_task_run_id, v_uid, p_decision, v_note);

  -- The run leaves the review queue.
  update public.task_run
     set status = p_decision::text::public.task_status,
         updated_at = now()
   where id = p_task_run_id;

  -- The event-log entry: the decision fact only, no sensitive content (ADR-0006). The
  -- audit_event_known_type check (ADR-0026) still applies.
  insert into public.audit_event (org_id, task_run_id, actor, event_type, payload)
  values (
    v_org,
    p_task_run_id,
    v_uid,
    case when p_decision = 'approved' then 'task_approved' else 'task_rejected' end,
    '{}'::jsonb
  );

  return 'ok';
end;
$$;

comment on function public.review_task_run(uuid, public.approval_decision, text, text) is
  'The only way to record a review decision: checks org + needs_review, refuses to approve a '
  'Co-Pilot "don''t" assessment (ADR-0036), then writes the optional reviewer edit, the approval, '
  'the status flip and the audit event in one transaction. ADR-0028.';

revoke all on function public.review_task_run(uuid, public.approval_decision, text, text)
  from public, anon;
grant execute on function public.review_task_run(uuid, public.approval_decision, text, text)
  to authenticated;
