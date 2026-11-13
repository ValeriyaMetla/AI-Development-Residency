-- Seed the one trivial "hero" Skill for the Phase 0 walking skeleton.
--
-- Skills are a global catalog (no org_id). RLS allows authenticated users to READ
-- skills but has no insert policy, so seeding is done here as a privileged migration
-- (runs as the owner, bypassing RLS). Idempotent via ON CONFLICT.
insert into public.skill (key, name, type, is_hero)
values ('draft_thank_you', 'Draft a thank-you note', 'skill', true)
on conflict (key) do nothing;
