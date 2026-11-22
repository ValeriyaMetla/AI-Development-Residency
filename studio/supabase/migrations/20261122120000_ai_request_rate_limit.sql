-- Rate-limit AI requests through one protected step (ADR-0030 · PenTest F-02 · SR-02 / SR-03).
--
-- WHY: the Co-Pilot had no limit at all, and the monthly Skill cap let runs through whenever its
-- count failed, so one account could call Claude as often as it liked (F-02, P1). The platform pays
-- for every call (ADR-0023).
--
-- WHAT THIS DOES:
--   1. `ai_request` — one row per allowed AI request: who, which org, which kind, when. Never the
--      text the person typed. Members can't read, add, change or delete rows directly, so nobody
--      can reset their own count.
--   2. `claim_ai_request(p_kind)` — the ONLY way to record a request. In one step it checks the
--      limits (10/min and 200/day per user, 1,000/day per org, 5,000/day across the platform) and
--      either records the request ('ok') or says which limit was hit, recording nothing.
--
-- NOTHING IN THE APP CALLS THIS YET. The app change (PR B) merges only after this migration is on
-- studio-pentest AND live, because the app will refuse every AI request until the function exists.
--
-- HOW TO APPLY: Supabase → SQL Editor → paste → Run → choose "Run without RLS".
-- studio-pentest first, then live. Then run supabase/checks/rate-limit-check.sql on each.
-- PRE-CHECK: nothing named ai_request / claim_ai_request may already exist (new table, no old data).
--
-- TO UNDO (if ever needed, before PR B merges):
--   drop function if exists public.claim_ai_request(text);
--   drop table if exists public.ai_request;

-- ---------------------------------------------------------------------------
-- 1. The counter table
-- ---------------------------------------------------------------------------
create table if not exists public.ai_request (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile (user_id) on delete cascade,
  org_id uuid not null references public.org (id) on delete cascade,
  kind text not null check (kind in ('copilot', 'skill')),
  created_at timestamptz not null default now()
);
comment on table public.ai_request is
  'One row per allowed AI request (Co-Pilot assessment or Skill run), for rate limits only. Holds no '
  'user text. Written only by claim_ai_request; rows older than 2 days are deleted. ADR-0030.';

-- The function counts recent rows four ways; these keep each count quick.
create index if not exists ai_request_user_time_idx on public.ai_request (user_id, created_at);
create index if not exists ai_request_org_time_idx on public.ai_request (org_id, created_at);
create index if not exists ai_request_time_idx on public.ai_request (created_at);

-- ---------------------------------------------------------------------------
-- 2. Lock it down — no direct access for app users at all
-- ---------------------------------------------------------------------------
-- 20261112010000_rls_policies.sql gives `authenticated` select/insert/update/delete on every NEW
-- table by default, so take all of it away here. Row-level security is on with NO member policies,
-- as a second lock. Only claim_ai_request (security definer) reads or writes this table.
alter table public.ai_request enable row level security;
revoke all on public.ai_request from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 3. The protected step
-- ---------------------------------------------------------------------------
-- Runs with elevated rights (security definer), so it bypasses RLS and MUST repeat every check
-- itself. search_path is pinned so no one can shadow a table or function name. The org comes from
-- current_org_id(), never from the caller, and the limits are fixed here (ADR-0030 point 3):
-- changing one takes a new migration, on purpose.
-- Returns a plain outcome instead of raising database error text:
--   'ok' · 'not_signed_in' · 'not_found' · 'invalid'
--   'user_minute' · 'user_day' · 'org_day' · 'platform_day'   (a limit was reached; nothing recorded)
create or replace function public.claim_ai_request(p_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_limit_user_minute constant int := 10;
  v_limit_user_day constant int := 200;
  v_limit_org_day constant int := 1000;
  v_limit_platform_day constant int := 5000;
begin
  -- Who is asking, and for which org.
  if v_uid is null then
    return 'not_signed_in';
  end if;
  v_org := public.current_org_id();
  if v_org is null then
    return 'not_found';
  end if;
  if p_kind is null or p_kind not in ('copilot', 'skill') then
    return 'invalid';
  end if;

  -- One request at a time per user, so a burst sent at the same instant can't all see "9 so far".
  -- Released automatically when this transaction ends.
  perform pg_advisory_xact_lock(hashtextextended('ai_request:' || v_uid::text, 0));

  -- Keep the table small: rows older than the longest window (24 hours) are no longer needed.
  delete from public.ai_request where created_at < now() - interval '2 days';

  -- Rolling windows. Each refusal records nothing, so a refused request doesn't use up the limit.
  if (select count(*) from public.ai_request
       where user_id = v_uid and created_at > now() - interval '1 minute') >= v_limit_user_minute then
    return 'user_minute';
  end if;
  if (select count(*) from public.ai_request
       where user_id = v_uid and created_at > now() - interval '24 hours') >= v_limit_user_day then
    return 'user_day';
  end if;
  if (select count(*) from public.ai_request
       where org_id = v_org and created_at > now() - interval '24 hours') >= v_limit_org_day then
    return 'org_day';
  end if;
  if (select count(*) from public.ai_request
       where created_at > now() - interval '24 hours') >= v_limit_platform_day then
    return 'platform_day';
  end if;

  insert into public.ai_request (user_id, org_id, kind) values (v_uid, v_org, p_kind);
  return 'ok';
end;
$$;

comment on function public.claim_ai_request(text) is
  'The only way to record an AI request: checks the per-user, per-org and platform limits, then '
  'records it in one step, or returns which limit was reached. ADR-0030.';

-- Only signed-in users may call it (Postgres grants EXECUTE to PUBLIC by default — remove that).
revoke all on function public.claim_ai_request(text) from public, anon;
grant execute on function public.claim_ai_request(text) to authenticated;
