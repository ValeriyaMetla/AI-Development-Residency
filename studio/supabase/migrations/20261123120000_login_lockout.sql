-- Throttle repeated failed logins — per account (escalating) and per IP
-- (ADR-0037 · PenTest F-04 · SR-07).
--
-- WHY: ten wrong passwords in a row produced no lockout, and Supabase's per-IP sign-in limit sees
-- the app SERVER's address (sign-in runs server-side), so it can't throttle a real attacker.
-- Password strength was fixed in group 0; this adds the lockout.
--
-- WHAT THIS DOES:
--   1. `login_lock`  — per-account escalation state (hash of the email, fail count, lock level,
--      locked_until). 5 failures -> 15-min lock, doubling on repeat (15/30/60...). A correct
--      password clears it.
--   2. `login_attempt` — per-IP rolling log of failed attempts (hash of the IP), for the
--      20-failures-in-15-minutes IP rule.
--   3. `login_guard(p_email, p_ip)`  -> 'ok' | 'locked', called BEFORE the password check.
--   4. `login_record(p_email, p_ip, p_success)` -> records the outcome, called AFTER.
--   Emails and IPs are hashed INSIDE the functions (SHA-256); the raw values are never stored.
--   Both tables are locked: RLS on, no policies, no grants to app users.
--
-- NOTHING IN THE APP CALLS THESE YET. The app change (PR 2) merges only after this migration is on
-- studio-pentest AND live, because the login action will call functions that must already exist.
--
-- HOW TO APPLY: Supabase -> SQL Editor -> paste -> Run -> "Run without RLS".
-- studio-pentest first, then live. Then run supabase/checks/login-lockout-check.sql on each.
-- PRE-CHECK: nothing named login_lock / login_attempt / login_guard / login_record may already exist.
--
-- TO UNDO (before PR 2 merges):
--   drop function if exists public.login_guard(text, text);
--   drop function if exists public.login_record(text, text, boolean);
--   drop table if exists public.login_attempt;
--   drop table if exists public.login_lock;

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Per-account escalation state. Keyed by a hash of the email, never the raw email.
-- ---------------------------------------------------------------------------
create table if not exists public.login_lock (
  email_hash text primary key,
  fail_count int not null default 0,
  lock_level int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.login_lock is
  'Per-account failed-login state for the lockout, keyed by a SHA-256 hash of the email (never the '
  'raw email). Written only by login_record; cleared on a successful login. ADR-0037.';

-- ---------------------------------------------------------------------------
-- 2. Per-IP rolling log of failed attempts. Keyed by a hash of the IP.
-- ---------------------------------------------------------------------------
create table if not exists public.login_attempt (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);
comment on table public.login_attempt is
  'One row per failed login attempt, for the per-IP limit only. Holds a SHA-256 hash of the IP, '
  'never the raw IP. Written only by login_record; rows older than 20 minutes are deleted. ADR-0037.';

create index if not exists login_attempt_ip_time_idx on public.login_attempt (ip_hash, created_at);

-- ---------------------------------------------------------------------------
-- 3. Lock both tables down — no direct access for app users at all.
-- 20261112010000_rls_policies.sql grants authenticated full access on every NEW table, so take it
-- all away. RLS on with NO policies, as a second lock. Only the functions (security definer) touch
-- these tables.
-- ---------------------------------------------------------------------------
alter table public.login_lock enable row level security;
alter table public.login_attempt enable row level security;
revoke all on public.login_lock from authenticated, anon;
revoke all on public.login_attempt from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4. The guard — checked BEFORE the password. Runs with elevated rights (security definer) and
-- repeats every check itself; search_path pinned; digest schema-qualified. Returns a plain outcome.
-- Callable by anon AND authenticated, because sign-in happens before login (ADR-0037, like ADR-0034).
-- ---------------------------------------------------------------------------
create or replace function public.login_guard(p_email text, p_ip text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email_hash text :=
    encode(extensions.digest(convert_to(lower(trim(coalesce(p_email, ''))), 'utf8'), 'sha256'), 'hex');
  v_ip_hash text :=
    encode(extensions.digest(convert_to(coalesce(p_ip, ''), 'utf8'), 'sha256'), 'hex');
  v_locked_until timestamptz;
  v_ip_fails int;
  v_ip_limit constant int := 20;
begin
  -- Account lock still in force?
  select locked_until into v_locked_until from public.login_lock where email_hash = v_email_hash;
  if v_locked_until is not null and v_locked_until > now() then
    return 'locked';
  end if;

  -- Too many failures from this IP in the last 15 minutes?
  select count(*) into v_ip_fails from public.login_attempt
    where ip_hash = v_ip_hash and created_at > now() - interval '15 minutes';
  if v_ip_fails >= v_ip_limit then
    return 'locked';
  end if;

  return 'ok';
end;
$$;

comment on function public.login_guard(text, text) is
  'Checked before the password: returns ''locked'' if the account is in a lockout window or the IP '
  'has 20+ failures in 15 minutes, else ''ok''. Hashes its inputs. ADR-0037.';

-- ---------------------------------------------------------------------------
-- 5. The recorder — called AFTER the password check with the outcome. Success clears the account's
-- lock; failure logs the IP and bumps the account, locking (with doubling) at 5. The limits
-- (5 / 15 minutes / 20) live here (ADR-0037): changing one takes a new migration.
-- ---------------------------------------------------------------------------
create or replace function public.login_record(p_email text, p_ip text, p_success boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email_hash text :=
    encode(extensions.digest(convert_to(lower(trim(coalesce(p_email, ''))), 'utf8'), 'sha256'), 'hex');
  v_ip_hash text :=
    encode(extensions.digest(convert_to(coalesce(p_ip, ''), 'utf8'), 'sha256'), 'hex');
  v_fail_count int;
  v_lock_level int;
  v_account_limit constant int := 5;
begin
  -- Keep both tables small.
  delete from public.login_attempt where created_at < now() - interval '20 minutes';
  delete from public.login_lock
    where (locked_until is null or locked_until < now() - interval '1 hour')
      and updated_at < now() - interval '1 hour';

  -- A correct password clears the escalation, so one mistyped password never creeps toward a lock.
  if p_success then
    delete from public.login_lock where email_hash = v_email_hash;
    return;
  end if;

  -- Failed attempt: log it for the IP rule.
  insert into public.login_attempt (ip_hash) values (v_ip_hash);

  -- Bump the account's consecutive-failure count (create the row on first failure).
  insert into public.login_lock as ll (email_hash, fail_count, lock_level, updated_at)
    values (v_email_hash, 1, 0, now())
  on conflict (email_hash) do update
    set fail_count = ll.fail_count + 1, updated_at = now();

  select fail_count, lock_level into v_fail_count, v_lock_level
    from public.login_lock where email_hash = v_email_hash;

  -- At the threshold, lock with an escalating (doubling) duration and reset the counter.
  if v_fail_count >= v_account_limit then
    update public.login_lock
      set lock_level = v_lock_level + 1,
          locked_until = now() + interval '15 minutes' * power(2, v_lock_level),
          fail_count = 0,
          updated_at = now()
    where email_hash = v_email_hash;
  end if;
end;
$$;

comment on function public.login_record(text, text, boolean) is
  'Records a login outcome: success clears the account lock; failure logs the IP and, at 5 '
  'consecutive failures, locks the account for 15 minutes, doubling on repeat. ADR-0037.';

-- ---------------------------------------------------------------------------
-- 6. Grants. Sign-in is pre-login, so BOTH anon and authenticated may call these (Postgres grants
-- EXECUTE to PUBLIC by default — remove that, then grant the two app roles explicitly).
-- ---------------------------------------------------------------------------
revoke all on function public.login_guard(text, text) from public;
grant execute on function public.login_guard(text, text) to anon, authenticated;
revoke all on function public.login_record(text, text, boolean) from public;
grant execute on function public.login_record(text, text, boolean) to anon, authenticated;
