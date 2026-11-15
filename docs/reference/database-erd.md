# Database diagram (ERD) — Community AI Workflow Studio (Release 1a)

Generated from the Supabase migrations in `studio/supabase/migrations/`. All org-scoped tables are
isolated by default-deny Row-Level Security on `current_org_id()` (ADR-0013 / ADR-0007 / ADR-0009).
`task_output` has a 1:1 relationship with `task_run` in practice; `audit_event` is append-only.

```mermaid
erDiagram
  auth_users ||--|| profile : "extends"
  org ||--o{ profile : "has members"
  org ||--o{ policy : "owns"
  org ||--o{ task_run : "scopes"
  org ||--o{ audit_event : "scopes"

  standard ||--o{ standard_rule : "contains"
  policy ||--o{ policy_rule : "contains"
  policy ||--o{ policy_seed_response : "answered by"
  standard_rule |o--o{ policy_rule : "grounds (nullable)"

  skill ||--o{ task_run : "run as"
  profile ||--o{ task_run : "run_by"
  policy |o--o{ task_run : "policy applied (nullable)"
  profile ||--o{ policy_seed_response : "created_by"

  task_run ||--o{ task_output : "produces"
  task_run ||--o{ guardrail_check : "checked by"
  task_run |o--o{ audit_event : "logged as (nullable)"
  profile |o--o{ audit_event : "actor (nullable)"
  task_run ||--o| copilot_assessment : "assessed by"
  policy |o--o{ copilot_assessment : "policy in force (nullable)"

  org {
    uuid id PK
    text name
    enum tier "free | premium"
    int onboarding_step
    timestamptz created_at
  }
  profile {
    uuid user_id PK "FK -> auth.users"
    uuid org_id FK
    enum role "accountable_leader | frontline_doer"
    text display_name
    timestamptz created_at
  }
  standard {
    uuid id PK
    enum name "nist_ai_rmf | eu_ai_act | iso_42001"
    text version
    enum tier "baseline | justice"
    timestamptz created_at
  }
  standard_rule {
    uuid id PK
    uuid standard_id FK
    text code UK
    text rule_text
    text category
    text risk_tier
    text citation
    timestamptz created_at
  }
  policy {
    uuid id PK
    uuid org_id FK
    text name
    enum status "draft | active | archived"
    timestamptz created_at
  }
  policy_rule {
    uuid id PK
    uuid policy_id FK
    uuid standard_rule_id FK "nullable"
    text rule_text
    text citation "snapshotted"
    text category
    text risk_tier
    enum origin "standard | baseline | custom"
    bool is_baseline_safety
    bool needs_review
    text source_question
    timestamptz created_at
  }
  policy_seed_response {
    uuid id PK
    uuid policy_id FK
    jsonb answers
    uuid created_by FK
    timestamptz created_at
  }
  skill {
    uuid id PK
    text key UK
    text name
    enum type "skill | copilot"
    bool is_hero
    timestamptz created_at
  }
  task_run {
    uuid id PK
    uuid org_id FK
    uuid skill_id FK
    uuid run_by FK
    uuid policy_id FK "nullable (version applied)"
    enum status "running | blocked | needs_review | approved | rejected | completed"
    text input_summary
    timestamptz created_at
    timestamptz updated_at
  }
  task_output {
    uuid id PK
    uuid task_run_id FK
    text content
    text provenance_label
    text self_critique_result
    timestamptz created_at
  }
  guardrail_check {
    uuid id PK
    uuid task_run_id FK
    enum check_type "rule_check | pii | risky_use | self_critique"
    enum result "pass | flag | block"
    text reason_plain
    timestamptz created_at
  }
  audit_event {
    uuid id PK
    uuid org_id FK
    uuid task_run_id FK "nullable"
    uuid actor FK "nullable"
    text event_type
    jsonb payload "non-sensitive (ADR-6)"
    timestamptz created_at
  }
  copilot_assessment {
    uuid id PK
    uuid task_run_id FK
    enum verdict "use | use_with_conditions | dont | out_of_scope"
    enum tier "minimal | limited | high | prohibited | undetermined"
    jsonb recommendation "signals, reasons, citations, safer-way, summary"
    uuid policy_id FK "nullable (policy in force)"
    text provenance_label
    bool human_decision_required
    timestamptz created_at
  }
```

## How to read it

- **Tenancy:** `org` is the tenant root — `profile`, `policy`, `task_run`, and `audit_event` all
  carry `org_id`, and RLS keys every read/write on the signed-in user's org.
- **Governance flow:** a `task_run` ties together *who* (`run_by` -> `profile`), *what* (`skill`),
  and *which rules* (`policy_id`, the version applied); it produces a `task_output` (with its
  provenance label), is `guardrail_check`-ed, and is recorded in the append-only `audit_event` log.
- **Grounding:** each `policy_rule` optionally cites the `standard_rule` it derives from (snapshotted
  `citation`), so policy advice traces back to NIST / EU AI Act / ISO 42001.
- **Co-Pilot:** a `copilot_assessment` is the immutable result a Governance Co-Pilot run produces —
  its verdict, risk tier, grounded recommendation, and whether a human must decide.
- `auth_users` is Supabase Auth's managed table; `profile` extends it 1:1.

## Notes

- `task_output` is modeled one-to-many to `task_run` but is 1:1 in practice.
- `guardrail_check` has a reserved (not-yet-added) `policy_rule_id` hook for Epic 5's rule-check.
- `copilot_assessment` is the Co-Pilot's immutable result record — a child of `task_run`, one per
  Co-Pilot run (built; ADR-0010, migration `20261114010000`). Design rationale:
  `docs/design/epic-4-copilot-design.md`.
