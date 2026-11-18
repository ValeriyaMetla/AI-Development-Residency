-- Epic 8 / Lane D, Phase 1 — entitlement: record WHEN a premium org's access ends.
--
-- ADR-0023 §7: a lapsed paid org falls back to the free cap, safety intact. org.tier already
-- exists (free | premium); the only missing fact is when premium ends. A premium org whose
-- premium_until is in the past is "lapsed" and resolves to the free cap (see
-- lib/domain/entitlements.ts::resolveEntitlement). Null = no end / not applicable — free orgs,
-- and (MVP, no billing yet) a premium org with no end date, which is treated as active.
--
-- No usage table: "runs this month" is derived from task_run (lib/data/entitlements.ts), so the
-- cap needs no new storage. org already has org-scoped RLS (20261112010000_rls_policies.sql);
-- this column is covered by it — no new policy. Additive, non-destructive.
-- Run in the Supabase SQL Editor with "Run without RLS".

alter table org add column premium_until timestamptz;

comment on column org.premium_until is
  'When premium access ends. Null = no end / not applicable. A premium org past this instant is lapsed and resolves to the free cap, with the full safety net intact (ADR-0023).';
