-- Auth: auto-provision an org + profile when a new user signs up (Step 4).
--
-- When Supabase Auth inserts a row into auth.users, this trigger creates:
--   1) a new org (name taken from sign-up metadata 'org_name', else a default), and
--   2) a profile linking the user to that org as 'accountable_leader'.
--
-- One-user-one-org for the MVP (ADR-9); Frontline-Doer invites are Release 1b.
--
-- SECURITY: runs as SECURITY DEFINER so it can insert under the default-deny RLS
-- from the first migration (the user's own JWT could not). search_path is pinned to
-- '' (empty) per Supabase's security guidance, so every object is schema-qualified
-- and the function can't be hijacked by a mutable search_path. ADR-0007.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
begin
  -- 1) Create the organization (name from sign-up metadata, with a safe fallback).
  insert into public.org (name)
  values (coalesce(nullif(new.raw_user_meta_data ->> 'org_name', ''), 'My organization'))
  returning id into new_org_id;

  -- 2) Create the profile as the org's Accountable Leader.
  insert into public.profile (user_id, org_id, role, display_name)
  values (
    new.id,
    new_org_id,
    'accountable_leader',
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  );

  return new;
end;
$$;

-- Drop-if-exists first so re-running this migration is safe (idempotent).
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
