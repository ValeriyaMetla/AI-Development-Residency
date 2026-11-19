# Measuring time-to-first-run (minutes-to-value)

Reference for the **minutes-to-value** metric on the onboarding card
*"Build the minutes-to-value onboarding flow"* (Epic #8, Release 1b, R5).

## What we measure

- **Primary metric:** median time from an org's sign-up to its **first governed run**
  (target: single-digit minutes).
- **Counter-metric (guard against "fast but hollow"):** first-run completion rate does not
  drop, and policies are not left empty/meaningless.

## Why there is nothing to "emit"

Both timestamps already persist, so the metric is derivable from existing data with no new
tracking, table, or write:

- **Sign-up time** → `org.created_at`. The org row is created at sign-up by the provisioning
  trigger (ADR-0007), so org creation ≈ the Accountable Leader's sign-up.
- **First governed run** → `min(task_run.created_at)` for the org. Every run is a governed run
  (it goes through the one pipeline), so the earliest `task_run` is the first governed run.

Measurement reads **timestamps and counts only** — never run input/output or PII (ADR-6 spirit).

## How to run it

These queries cross org boundaries (a product KPI over all orgs), which RLS deliberately blocks
for an app user. Run them in the **Supabase SQL Editor** (service-role / "Run without RLS"
context) — this is an ops report, not in-app code.

### Per-org time-to-first-run

```sql
select
  o.id   as org_id,
  o.created_at as signed_up_at,
  f.first_run_at,
  f.first_run_at - o.created_at as time_to_first_run
from org o
join (
  select org_id, min(created_at) as first_run_at
  from task_run
  group by org_id
) f on f.org_id = o.id
order by time_to_first_run;
```

### Median minutes to first run (the primary metric)

```sql
select
  percentile_cont(0.5) within group (
    order by extract(epoch from (f.first_run_at - o.created_at)) / 60.0
  ) as median_minutes_to_first_run
from org o
join (
  select org_id, min(created_at) as first_run_at
  from task_run
  group by org_id
) f on f.org_id = o.id;
```

Only orgs that have reached a first run are counted (the `join` excludes orgs with zero runs).

### Counter-metric — fast but not hollow

```sql
-- First-run reach rate: of orgs that signed up, the share that made at least one run.
select
  count(*) filter (where f.first_run_at is not null)::numeric / nullif(count(*), 0)
    as first_run_reach_rate
from org o
left join (
  select org_id, min(created_at) as first_run_at from task_run group by org_id
) f on f.org_id = o.id;

-- Not hollow: of orgs with an ACTIVE policy, the share whose policy has at least one rule
-- (a seeded-but-empty policy would be "fast but meaningless").
select
  count(*) filter (where r.rule_count > 0)::numeric / nullif(count(*), 0)
    as non_empty_active_policy_rate
from policy p
left join (
  select policy_id, count(*) as rule_count from policy_rule group by policy_id
) r on r.policy_id = p.id
where p.status = 'active';
```

## Caveats (verify before quoting a number)

- **Sign-up ≈ `org.created_at`** is an inference from the provisioning trigger (ADR-0007). If an
  org is ever created by any path other than a leader sign-up, revisit this proxy.
- **"First run"** counts the earliest `task_run` regardless of outcome. A first run that was
  *blocked before output* (e.g. empty input) still stamps a `task_run` row; filter on
  `status <> 'blocked'` if you want "first run that produced a reviewable draft."
- A capped-out run (ADR-0023) is blocked **before** a `task_run` is opened, so it never inflates
  these counts.

## Scope

This closes R5 ("time-to-first-run is measured") for the minutes-to-value card. The remaining
gaps on that card — the accept-defaults fast seed (R2) and the "Next: run your first Skill →"
link on the policy-activated screen (R3) — live in Lane A's policy-seed wizard and are tracked as
Lane A asks, not built here.
