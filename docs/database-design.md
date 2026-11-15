# Database design — Community AI Workflow Studio (Release 1a)

Reconciled with the implemented Supabase migrations in `studio/supabase/migrations/` (the migrations
are the technical source of truth). The visual diagram is in
[`docs/reference/database-erd.md`](reference/database-erd.md). Live RLS verification and the
two-account isolation test are confirmed in the live Supabase project, not here.

## What the app needs to save

- Each organization, so every customer's data stays inside its own workspace.
- Each signed-in person's organization, role, and display name.
- The global catalog of AI Skills and the Governance Co-Pilot.
- Every governed task run — who started it, its status, output, and the policy version applied.
- Every guardrail result, and an append-only audit history with no sensitive content.
- Governance standards and the cited rules that ground recommendations.
- Each organization's AI policy, its policy rules, and the policy-seed intake answers.
- Each Governance Co-Pilot risk assessment: verdict, tier, recommendation, and human-decision flag.

Supabase manages `auth.users`; the app does not create it. `profile` extends it.

## Tables

### org
The root of tenant isolation — one organization using the studio.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Organization identifier |
| name | text | yes | Organization name |
| tier | enum | yes | free or premium |
| onboarding_step | int | yes | Current onboarding step |
| created_at | timestamptz | yes | Creation time |

Read: a person reads only their organization. Write: no direct signed-in-user write policy.

### profile
A user's organization membership and app role; extends Supabase Auth.

| Column | Type | Required | Meaning |
|---|---|---|---|
| user_id | uuid (PK) | yes | Matches `auth.users` |
| org_id | uuid (FK → org) | yes | Organization membership |
| role | enum | yes | accountable_leader or frontline_doer |
| display_name | text | no | Name shown in the app |
| created_at | timestamptz | yes | Creation time |

Read: a person reads only their own profile. Write: no direct signed-in-user write policy.

### skill
The global catalog of governed Skills and the Governance Co-Pilot.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Skill identifier |
| key | text (unique) | yes | Stable app key |
| name | text | yes | Display name |
| type | enum | yes | skill or copilot |
| is_hero | bool | yes | Whether it is featured |
| created_at | timestamptz | yes | Creation time |

Read: any authenticated user. Write: not modifiable through the app (read-only catalog).

### task_run
One governed execution — tenant, user, status, and policy provenance.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Run identifier |
| org_id | uuid (FK → org) | yes | Owning organization |
| skill_id | uuid (FK → skill) | yes | Skill that ran |
| run_by | uuid (FK → profile) | yes | Who started it |
| policy_id | uuid (FK → policy) | no | Policy version applied |
| status | enum | yes | running / blocked / needs_review / approved / rejected / completed |
| input_summary | text | no | Limited input summary |
| created_at | timestamptz | yes | Start time |
| updated_at | timestamptz | yes | Last change |

Read: runs in the person's org. Write: insert as self, update within the org; no delete.

### task_output
The output of a governed run, with provenance and self-critique.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Output identifier |
| task_run_id | uuid (FK → task_run) | yes | Parent run |
| content | text | no | Generated output |
| provenance_label | text | no | Governance/source label |
| self_critique_result | text | no | Self-critique result |
| created_at | timestamptz | yes | Creation time |

Read/write: scoped via the parent run's org; insert for an owned run; no update/delete.

### guardrail_check
One safety or policy check on a task run.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Check identifier |
| task_run_id | uuid (FK → task_run) | yes | Parent run |
| check_type | enum | yes | rule_check / pii / risky_use / self_critique |
| result | enum | yes | pass / flag / block |
| reason_plain | text | no | Plain-language reason |
| created_at | timestamptz | yes | Creation time |

Read/write: scoped via the parent run's org; insert for an owned run; no update/delete.

### audit_event
Append-only record of important activity, with no sensitive content (ADR-6).

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Event identifier |
| org_id | uuid (FK → org) | yes | Owning organization |
| task_run_id | uuid (FK → task_run) | no | Related run |
| actor | uuid (FK → profile) | no | Related profile |
| event_type | text | yes | Kind of event |
| payload | jsonb | yes | Non-sensitive event details |
| created_at | timestamptz | yes | Event time |

Read: events in the person's org. Write: insert within the org; no update/delete (append-only).

### standard
A source governance framework (NIST AI RMF, EU AI Act, ISO 42001).

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Standard identifier |
| name | enum | yes | Framework name |
| version | text | yes | Framework version |
| tier | enum | yes | baseline or justice |
| created_at | timestamptz | yes | Creation time |

Read: any authenticated user. Write: not modifiable through the app (read-only catalog).

### standard_rule
One cited rule derived from a governance standard.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Rule identifier |
| standard_id | uuid (FK → standard) | yes | Parent standard |
| code | text (unique) | yes | Unique rule code |
| rule_text | text | yes | Plain-language rule |
| category | text | yes | Governance category |
| risk_tier | text | yes | Associated risk tier |
| citation | text | yes | Source citation |
| created_at | timestamptz | yes | Creation time |

Read: any authenticated user. Write: not modifiable through the app (read-only catalog).

### policy
An organization's AI policy and its lifecycle status.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Policy identifier |
| org_id | uuid (FK → org) | yes | Owning organization |
| name | text | yes | Policy name |
| status | enum | yes | draft / active / archived |
| created_at | timestamptz | yes | Creation time |

Read: policies in the person's org. Write: insert + update within the org; no delete. Only one
policy may be `active` per organization.

### policy_rule
One plain-language rule inside an organization's policy.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Rule identifier |
| policy_id | uuid (FK → policy) | yes | Parent policy |
| rule_text | text | yes | Plain-language rule |
| standard_rule_id | uuid (FK → standard_rule) | no | Grounding rule (null = custom) |
| citation | text | no | Snapshotted citation |
| category | text | yes | Governance category |
| risk_tier | text | yes | Risk level |
| origin | enum | yes | standard / baseline / custom |
| is_baseline_safety | bool | yes | Baseline-safety (non-overridable) flag |
| needs_review | bool | yes | Human-review flag |
| source_question | text | no | Intake question it came from |
| created_at | timestamptz | yes | Creation time |

Read/write: scoped via the parent policy's org; insert within the org; no update/delete in 1a.

### policy_seed_response
The immutable intake answers used to generate a policy.

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Response identifier |
| policy_id | uuid (FK → policy) | yes | Parent policy |
| answers | jsonb | yes | Intake answers |
| created_by | uuid (FK → profile) | yes | Submitting profile |
| created_at | timestamptz | yes | Creation time |

Read/write: scoped via the parent policy's org; insert as self; no update/delete.

### copilot_assessment
One immutable Governance Co-Pilot risk assessment (ADR-0010).

| Column | Type | Required | Meaning |
|---|---|---|---|
| id | uuid (PK) | yes | Assessment identifier |
| task_run_id | uuid (FK → task_run) | yes | Parent governed run |
| verdict | enum | yes | use / use_with_conditions / dont / out_of_scope |
| tier | enum | yes | minimal / limited / high / prohibited / undetermined |
| recommendation | jsonb | yes | Signals, reasons, citations, safer-way, summary |
| policy_id | uuid (FK → policy) | no | Policy in force |
| provenance_label | text | no | Governance provenance |
| human_decision_required | bool | yes | Human-decision flag |
| created_at | timestamptz | yes | Creation time |

Read/write: scoped via the parent run's org; insert for an owned run; no update/delete.

## How the tables connect

- One Supabase Auth user has one `profile`; each `profile` belongs to one `org`.
- One `org` has many profiles, policies, task runs, and audit events.
- One `standard` contains many `standard_rule`s.
- One `policy` contains many `policy_rule`s and `policy_seed_response`s.
- One `standard_rule` can ground many `policy_rule`s; a custom rule has none.
- One `profile` can submit many policy-seed responses and start many task runs.
- One `skill` (or the Co-Pilot) can have many task runs.
- One `policy` can apply to many task runs; a run may have no policy if none was active.
- One `task_run` can produce an output, guardrail checks, audit events, and one
  `copilot_assessment`.
- Global catalog tables (`skill`, `standard`, `standard_rule`) are shared read-only; org-owned
  tables are isolated by RLS.

## Access rules (Row-Level Security)

- **Own identity:** a person reads only their own `profile` and `org`.
- **Org-scoped records:** policies, runs, outputs, checks, assessments, and audit events stay inside
  the signed-in person's org (keyed on `current_org_id()`).
- **Global read-only catalogs:** Skills, standards, and standard rules are readable by any
  authenticated user but not writable through the app.

RLS is enabled on every application table (default-deny). See ADR-0013 (Supabase), ADR-0007
(sign-up provisioning), and ADR-0009 (policy data model).

## Diagram and migrations

- Diagram: [`docs/reference/database-erd.md`](reference/database-erd.md)
- Migrations: [`studio/supabase/migrations/`](../studio/supabase/migrations/)
