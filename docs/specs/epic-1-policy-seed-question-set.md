# Spec — Policy-Seed Question Set (v1.0)

**Epic:** 1 — Set Your Rules / Policy Seed · **Feature:** Policy-seed intake · **Release:** 1a
**Status:** Locked v1.0 (agreed final content) · **Last updated:** 2026-11-13
**Doc type:** Reference (the finalized question set), with a clearly separated design-rationale section.

**Source tickets (authoritative *what & why*):**

- [Design the seed question set](https://app.notion.com/p/407975c3b9508150ae82d61de80de331) — this spec fulfills it.
- [Generate a starter policy from answers (risk-first)](https://app.notion.com/p/407975c3b95081ac8fa4efe24eee275f) — the downstream generator that consumes this set.

**Grounding:** the `standard_rule` codes referenced below are the nine baseline rules seeded in
[`studio/supabase/migrations/20261113010000_seed_standards.sql`](../../studio/supabase/migrations/20261113010000_seed_standards.sql)
(ADR-0008). Every question maps to one or more of them; that mapping is the citation/provenance the
generator ticket requires.

---

## 1. Purpose

> As the **Accountable Leader**, I want to answer a short guided set of questions, so that I get a
> usable starter AI policy in minutes — without hiring a consultant. *(Source: ticket user story.)*

The question set is the input to the policy generator. Its job is to collect the minimum a
non-expert can answer in ≤5 minutes, such that the generator can turn the answers into a real,
plain-language, standards-grounded starter policy.

## 2. Answer modes

Each question is one of three modes. This resolves the ticket's "optional question → safe default"
rule explicitly:

| Mode | Meaning |
|---|---|
| **Required** | Must answer; no default. |
| **Defaultable** | Must engage, but "Not sure" is a valid answer that triggers a fail-safe default (flagged for review). |
| **Optional** | May skip; a documented safe default applies. |

## 3. The question set

### Q1 · Required — seeds `nist-human-oversight`

> **Who's responsible for how your organization uses AI?**
> *The person with the final say, who others can go to with questions. This can be you.*

- **Answer:** Name + Role (text)
- **Rule produced:** *"[Name], [Role], is accountable for the organization's AI use and has the final say — AI assists, people decide."*

### Q2 · Required — seeds `nist-document-use`

> **What do you expect to use AI for?**
> *Pick anything that fits. You can change this later.*

- **Answer (choose ≥1):** Drafting emails, letters, or communications · Summarizing documents or
  notes · Research and finding information · Writing or editing content (reports, grants, posts) ·
  Administrative help (scheduling, lists, cleanup) · Something else *(describe)*
- **Rule produced:** *"We record what we use AI for ([selected purposes]), its context, and who's responsible, before relying on it."*

### Q3 · Defaultable — seeds `iso42001-data-governance`

> **Will AI ever work with personal or sensitive information?**
> *For example: donor or client details, health or financial information, anything confidential.*

- **Answer:** Yes · No · Not sure
- **If Yes / Not sure:** *"We govern the data we put into AI: we minimize it, check its quality, and protect sensitive information."*
- **Safe default (Not sure):** treat as **Yes** → apply the rule, **flagged for review.**

### Q4 · Defaultable — seeds `nist-check-output`, `euaiact-match-risk`, `euaiact-human-override`

> **Will AI help with higher-stakes decisions or work?**
> *Anything that could affect a person's services, money, rights, safety, or reputation.*

- **Answer:** Yes · No · Not sure
- **If Yes / Not sure:** *"For higher-stakes AI work, we check output carefully before acting, match safeguards to the risk, and a person can review, override, or stop the AI."*
- **Safe default (Not sure):** treat as **Yes** → apply the high-risk rules, **flagged for review.**
  (These rules become non-overridable when they apply — see §6.)

### Q5 · Optional — seeds `euaiact-disclose-ai`

> **Will AI-generated content be shared with people outside your organization?**
> *Such as clients, donors, partners, or the public.*

- **Answer:** Yes · No · Not sure
- **If Yes / Not sure:** *"We tell people when they're dealing with AI, and we label AI-generated content."*
- **Safe default (skipped):** assume **Yes** → require disclosure + labeling, **flagged for review.**

### Q6 · Optional — seeds `euaiact-human-override` (parameterizes the review gate); shown only if Q4 ≠ No

> **For higher-stakes AI work, who should check it before it's used or sent?**
> *A person reviews and approves before it goes out. Leave blank to use the person from Q1.*

- **Answer:** Name/role (text, optional)
- **Rule produced:** *"Before higher-stakes AI output is used or sent, [reviewer] reviews and approves it."*
- **Safe default (blank):** the accountable person from Q1 is the reviewer.

### Q7 · Optional — seeds `euaiact-match-risk` + responsible-AI prohibited-use baseline (locked, non-overridable)

> **Are there things you want to rule out completely?**
> *Some limits are always on and can't be turned off (below). You can add your own.*

- **Always-on (locked, read-only, checked):**
  - *"We won't use AI to manipulate or deceive people."*
  - *"We won't use AI to score, rank, or judge people (for example, who deserves help)."*
  - *"We won't use AI for any legally banned purpose."*
- **Answer:** "Add your own limits" (free text, optional)
- **Safe default (skipped):** the locked baseline applies; no additions.

## 4. Auto-seeded baselines (no question, always on, non-overridable)

| Rule | Policy rule produced |
|---|---|
| `iso42001-managed-logging` | *"We keep a log of how AI is used and review it regularly."* |
| `iso42001-records` | *"We keep records showing how AI outputs were produced and checked."* |

## 5. Acceptance-criteria check

Against the "Design the seed question set" ticket:

| Ticket criterion | Met by |
|---|---|
| **Coverage** — every question maps to ≥1 rule (no orphans) | All 9 `standard_rule`s seeded (7 via Q1–Q7, 2 auto-seeded); §3 + §4 |
| **Plain language** — answerable without AI/legal knowledge | Plain wording + help text on every question |
| **5-minute promise** — ≤ ~8–10 questions | 7 questions |
| **Safe defaults** — every optional question has a documented default | Documented defaults for every Defaultable/Optional question (Q3–Q7) |

## 6. Design rationale (explanation)

*Separated from the reference above so the facts stay clean.*

- **Why "Not sure" triggers a fail-safe default.** Forcing a non-expert to pick Yes/No when they
  genuinely don't know produces worse data than a cautious default. Skipped/unsure answers resolve
  to the *more* protective rule and are flagged for review — the responsible-AI fail-safe posture.
- **Why Q1 and Q7 exist.** They are responsible-AI-driven, but not orphans: Q1 maps to
  `nist-human-oversight` and Q7 maps to `euaiact-match-risk`, so both satisfy the coverage rule and
  both strengthen the generator's required non-overridable baseline.
- **Backward-mapping method.** Questions were derived from the nine seeded rules (what must the org
  tell us to turn each generic rule into *their* rule?), which is what guarantees no orphan questions.

## 7. Handoffs & deferred decisions

- **Provenance:** each question names the `standard_rule` code(s) it seeds → the citation link the
  generator ("Generate a starter policy from answers") requires.
- **Answer persistence:** raw answers must be stored so the generator can re-run and flag skipped
  questions. The storing table is **deferred to the data-model step + ADR** (the tickets name only
  `policy` / `policy_rule`; a response table is our inference, not yet decided).
- **Non-overridable set** (`is_baseline_safety`): Q1, the Q7 locked items, both auto-seeded
  baselines, and the Q3/Q4 rules when they apply → finalized in the **data-model step**.
- **Conditional display** (Q6 shown only if Q4 ≠ No): logic specified here; rendering belongs to the
  **intake-flow UI step** (`ux-usability` / `accessibility`).

## 8. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Q2 purposes: fixed vocabulary vs. free text (matters only if purposes should later seed *extra* rules). | Val |
| 2 | Final `is_baseline_safety` set + answer field shapes. | Data-model step |

## 9. Sources

- Notion tickets linked at the top of this doc (acceptance criteria quoted from them).
- Baseline rules: `studio/supabase/migrations/20261113010000_seed_standards.sql` (ADR-0008).
- Rule text is *our* plain-language synthesis of the frameworks (NIST AI RMF, EU AI Act, ISO/IEC
  42001), not verbatim quotes; each rule cites its source at the precision we can verify.
