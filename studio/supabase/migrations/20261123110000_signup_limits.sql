-- Limit sign-ups: name-length constraints + one protected per-IP counter
-- (ADR-0034 · PenTest F-07 · SR-11 / SR-12).
--
-- WHY: org/display names had no length limit (a 5,000-char name was stored), and the sign-up form
-- had no per-IP throttle, so one script could create unlimited orgs (amplifying F-02, ADR-0030).
--
-- WHAT THIS DOES:
--   1. CHECK constraints cap org.name (<=120) and profile.display_name (<=80) — enforced on EVERY
--      path, so handle_new_user refuses an oversized name whether it comes from the app or a direct
--      Supabase Auth API sign-up (the auth.users insert then rolls back; no account/org is created).
--   2. `signup_attempt` — one row per counted app-form sign-up attempt: a SHA-256 hash of the IP
--      (never the raw IP) and when. Members can't read, add, change or delete rows directly.
--   3. `claim_signup_attempt(p_ip)` — the app's sign-up form calls this BEFORE auth.signUp. It
--      allows up to 5 attempts per IP per hour, else returns 'ip_hour' and records nothing.
--
-- NOTHING IN THE APP CALLS claim_signup_attempt YET. The app change (PR 2) merges only after this
-- migration is on studio-pentest AND live.
--
-- HOW TO APPLY: Supabase -> SQL Editor -> paste -> Run -> "Run without RLS".
-- studio-pentest first, then live. Then run supabase/checks/signup-rate-limit-check.sql on each.
-- PRE-CHECK (run first, see the handover note): this script truncates any name over the new limits
-- before adding the constraints, so it applies cleanly.
-- PRE-CHECK: nothing named signup_attempt / claim_signup_attempt may already exist.
--
-- TO UNDO (before PR 2 merges):
--   drop function if exists public.claim_signup_attempt(text);
--   drop table if exists public.signup_attempt;
--   alter table public.org drop constraint if exists org_name_len;
--   alter table public.profile drop constraint if exists profile_display_name_len;

-- ---------------------------------------------------------------------------
-- 1. Name-length constraints (SR-11). Truncate any existing over-length values
--    first (e.g. the pentest's 5,000-char name) so the constraint can be added.
-- ---------------------------------------------------------------------------
update public.org set name = left(name, 120) where char_length(name) > 120;
update public.profile set display_name = left(display_name, 80) where char_length(display_name) > 80;

alter table public.org
  add constraint org_name_len check (char_length(name) <= 120);
alter table public.profile
  add constraint profile_display_name_len
  check (display_name is null or char_length(display_name) <= 80);

-- ---------------------------------------------------------------------------
-- 2. The per-IP counter table — stores only a hash of the IP, never the raw IP.
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.signup_attempt (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);
comment on table public.signup_attempt is
  'One row per counted app-form sign-up attempt, for the per-IP limit only. Holds a SHA-256 hash of '
  'the IP, never the raw IP. Written only by claim_signup_attempt; rows older than 2 hours are '
  'deleted. ADR-0034.';

create index if not exists signup_attempt_hash_time_idx
  on public.signup_attempt (ip_hash, created_at);

-- ---------------------------------------------------------------------------
-- 3. Lock it down — no direct access for app users at all.
-- 20261112010000_rls_policies.sql grants authenticated full access on every NEW table, so take it
-- all away here. RLS on with NO policies, as a second lock. Only claim_signup_attempt touches it.
-- ---------------------------------------------------------------------------
alter table public.signup_attempt enable row level security;
revoke all on public.signup_attempt from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4. The protected step. Runs with elevated rights (security definer), so it bypasses RLS and MUST
-- repeat every check itself. search_path pinned; digest is schema-qualified (extensions.digest).
-- The limit (5/hour) is fixed here (ADR-0034 point 6): changing it takes a new migration.
-- Returns 'ok' (recorded) or 'ip_hour' (limit reached; nothing recorded).
-- Callable by anon AND authenticated, because sign-up happens before login (ADR-0034 point 4).
-- ---------------------------------------------------------------------------
create or replace function public.claim_signup_attempt(p_ip text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := encode(extensions.digest(convert_to(coalesce(p_ip, ''), 'utf8'), 'sha256'), 'hex');
  v_limit_ip_hour constant int := 5;
begin
  -- One attempt at a time per IP, so a burst sent at the same instant can't all see "4 so far".
  perform pg_advisory_xact_lock(hashtextextended('signup_attempt:' || v_hash, 0));

  -- Keep the table small: rows past the window (1 hour) plus a margin are no longer needed.
  delete from public.signup_attempt where created_at < now() - interval '2 hours';

  if (select count(*) from public.signup_attempt
       where ip_hash = v_hash and created_at > now() - interval '1 hour') >= v_limit_ip_hour then
    return 'ip_hour';
  end if;

  insert into public.signup_attempt (ip_hash) values (v_hash);
  return 'ok';
end;
$$;

comment on function public.claim_signup_attempt(text) is
  'The sign-up form calls this before creating an account: allows up to 5 attempts per IP per hour, '
  'else returns ip_hour. Stores only a hash of the IP. ADR-0034.';

-- Sign-up is pre-login, so BOTH anon and authenticated may call it (Postgres grants EXECUTE to
-- PUBLIC by default — remove that, then grant the two app roles explicitly).
revoke all on function public.claim_signup_attempt(text) from public;
grant execute on function public.claim_signup_attempt(text) to anon, authenticated;
