-- Rule suggestions from the registry (Chunk 4 · Living policy) — ADR-0025.
--
-- WHAT: (1) a `suggested` rule origin + a nullable `suggestion_key` on policy_rule, so an accepted
-- suggestion's provenance reads "Suggested from your usage" (the origin the plain-language
-- rule-format spec reserved for 1b); (2) an append-only `rule_suggestion_decision` table recording
-- the Accountable Leader's accept / dismiss decision per suggestion key. A key with any decision is
-- never suggested again — that one record serves both dedup and "dismissals are remembered".
--
-- WHY append-only: a governance decision, once made, is history (same posture as approval and
-- run_correction). A later change of mind appends a new row; it never rewrites the old one.
--
-- Leader-only is enforced in the Service layer (as publishRuleEdits does); RLS here is org-scoped,
-- and you can only record a decision as yourself.
--
-- NOTE (Postgres): a value added with ALTER TYPE ... ADD VALUE cannot be USED in the same
-- transaction that adds it. Nothing below uses 'suggested', so the script runs as one unit.
--
-- Run in the Supabase SQL Editor with "Run without RLS" (this script enables RLS itself).

-- ============================================================================
-- 1. policy_rule: the `suggested` origin + the key it came from
-- ============================================================================
alter type policy_rule_origin add value if not exists 'suggested';

alter table policy_rule
  add column if not exists suggestion_key text
  check (suggestion_key is null or char_length(suggestion_key) between 1 and 64);

comment on column policy_rule.suggestion_key is
  'For origin = suggested: the rule-suggestion key it was accepted from (e.g. risky:medical). ADR-0025.';

-- ============================================================================
-- 2. rule_suggestion_decision: the leader's recorded decision per suggestion key
-- ============================================================================
create type suggestion_decision as enum ('accepted', 'dismissed');

create table rule_suggestion_decision (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  suggestion_key text not null check (char_length(suggestion_key) between 1 and 64),
  decision suggestion_decision not null,
  decided_by uuid not null references profile (user_id),
  -- The policy version an accept published (null for a dismissal).
  policy_id uuid references policy (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table rule_suggestion_decision is
  'The Accountable Leader''s accept/dismiss decision on a rule suggestion. Append-only; a key with '
  'any decision is never re-suggested. ADR-0025.';
create index rule_suggestion_decision_org_key_idx on rule_suggestion_decision (org_id, suggestion_key);

-- ============================================================================
-- RLS - org-scoped. Least privilege = only these policies exist: SELECT + INSERT.
-- You record your OWN decision (decided_by = you), for your own org.
-- ============================================================================
alter table rule_suggestion_decision enable row level security;

drop policy if exists "rule_suggestion_decision_select_org" on public.rule_suggestion_decision;
create policy "rule_suggestion_decision_select_org"
  on public.rule_suggestion_decision for select
  to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "rule_suggestion_decision_insert_org" on public.rule_suggestion_decision;
create policy "rule_suggestion_decision_insert_org"
  on public.rule_suggestion_decision for insert
  to authenticated
  with check (
    org_id = public.current_org_id()
    and decided_by = (select auth.uid())
  );

-- ============================================================================
-- Append-only at the privilege level (mirrors approval / run_correction), and no TRUNCATE
-- (20261118040000_revoke_truncate.sql — TRUNCATE ignores RLS).
-- ============================================================================
revoke update, delete, truncate on public.rule_suggestion_decision from authenticated;
revoke update, delete, truncate on public.rule_suggestion_decision from anon;
