# Epic 4 — Governance Co-Pilot — Design Spec

**Status:** Design in progress (non-code). Release 1a hero feature.
**Owner (named, accountable for this feature's outcomes):** Valeriya Metla (product), with the Accountable Leader as the human who decides on every assessment.
**Last updated:** 2026-11-13

---

## About this document

This is a **design spec only** — no code, no migrations, no database changes. Epic 4 depends on
Epic 1 (the org policy), which is being built in parallel. We design the Co-Pilot now so it is
ready to build the moment Epic 1 lands. Per the Epic 4 handover, this document lives in
`docs/design/` and does **not** add a numbered ADR under `docs/adr/` (to avoid colliding with the
Epic 1 chat's ADR numbering); the proposed ADR is captured inline in §"Proposed ADR" below and will
be numbered when Epic 4 is built.

Everything here is a **proposal for review**, decided one step at a time with Val — not a decision
made alone.

---

## 1. Context

### What the Co-Pilot is

The Accountable Leader (a non-technical ED/Ops director — no policy, no tech team, no time) asks
**"should we use AI for this, and how?"** and gets a grounded, defensible answer: a clear verdict,
plain-language reasons, a safer way when one exists, and a citation to the recognized standard
behind each point.

**Release 1a features** (source: Notion "Epics and Features" page, Epic #4 — read 2026-11-13):

1. **"Should we use AI for this?" advisory flow** `[Must]` — a `use / use-with-conditions / don't`
   recommendation with plain-language reasons. Risky use conflicting with policy or law → advises
   against and explains. A question it can't responsibly answer → says so and points to a human.
2. **"…and how" — safer-way recommendation** `[Must]` — when a use is risky, offer a concrete safer
   path (e.g., strip data first, add human review); when there's no safe version, a clear "don't."
3. **Expert defaults / always-on guidance** `[Should]` — sensible defaults with no configuration; an
   override persists.
4. **Grounded in the standards library** `[Should]` — each recommendation cites the baseline standard
   it draws on (NIST / EU AI Act / ISO 42001) and reflects the current version.

> **Sourcing flag:** the framing "transparent **risk-tiering**" that drives this design comes from
> the **Build Plan** (via the Epic 4 handover: *"Epic 4: Governance Co-Pilot + transparent
> risk-tiering (needs engine + standards) → logs to Epic 2"*). The Epic #4 section of the "Epics and
> Features" page does **not** itself use that term. **To verify:** confirm the exact Build Plan
> wording before the ADR is finalized.

### What it builds on (already live, Epic 0)

- **The governed-run pipeline** — `studio/lib/domain/pipeline.ts`. The one fixed path every AI task
  takes: context → draft → self-critique → rule-check → provenance → persist + audit. A Co-Pilot
  assessment runs through this, not around it. The `skill` enum already anticipates a `copilot` type.
- **The standards library** — `studio/lib/data/standards.ts` + tables `standard` / `standard_rule`
  (ADR-0008). A global read-only catalog of cited, plain-language baseline rules, queryable by
  category, each carrying a `risk_tier`. This is the citation source.
- **Epic 1's policy** (in build now) — the org's active rules. The Co-Pilot checks a use against the
  active policy *and* the standards library. We design against this; we don't wait on it.

### Internal layering (ADR-0003, enforced)

Presentation → Service → Domain → Data-Source. The risk-tiering engine is **Domain-layer** (pure
rules, no I/O); the standards/policy reads and the Claude call are **Data-Source**. The "Leak Test":
no governance logic in the UI.

---

## 2. Design decisions — index

This reorganizes the handover's six-decision list to track the pieces as we actually design them;
in particular, **the safer-way is pulled out as its own decision (#2)**.

| # | Design piece | Status |
|---|---|---|
| **1** | **Transparent risk-tiering (the engine — code decides the tier, LLM only explains)** | **Designed — §3** |
| **2** | **The safer-way ("…and how") — mitigations re-tier; irreducible → Don't** | **Designed — §4** |
| **3** | **Grounding + provenance (policy + standards, which source backs each point)** | **Designed — §6** |
| 4 | Pipeline fit (how an assessment flows through the governed-run pipeline) | Not yet designed |
| **5** | **Data model — `copilot_assessment` (design only, org-owned → org-scoped RLS)** | **Designed — §7** |
| **6** | **Output shape (recommendation object + presentation)** | **Designed — §5** |
| 7 | Responsible-AI stance (advises/human decides, out-of-scope → human, no fabricated cites) | Woven through §3–§4; to consolidate |

---

## 3. Decision #1 — Transparent risk-tiering

### 3.1 The trust claim (why this decision is load-bearing)

The Co-Pilot's verdict can steer whether a crisis client gets an AI-drafted reply, or whether donor
data goes to a model. The **risk tier** is the part that carries that weight — the verdict, the
safer-way, and the citations all hang off it.

The trust claim is: **we can show you *why* you got this tier, and the same inputs always give the
same tier.** A black-box model verdict ("this is high-risk, trust me") can't be defended to a funder
or a board and can't be audited. So the tier is decided by **deterministic Domain-layer code**, not
by the model. This is the product's core credibility promise.

### 3.2 Interaction model — option C (signal-source cleanly split from tier-decision)

The tension: the leader describes a use in **free text**, but code can't read a paragraph
deterministically. The resolution is to split two jobs that usually get mashed together:

- **Signal extraction (reading the use)** — turn the use into a handful of structured, visible
  yes/no **signals**.
- **Tier decision (judging)** — **pure code** maps those signals to a tier via a fixed, readable
  table, grounded in the standards library.

The code is the judge; the signals are the evidence shown to the leader. The LLM's role is only to
help read the softer signals, **explain** the code's verdict in plain language, and **draft** the
safer-way — never to decide the tier or pick a citation.

**Chosen for Release 1a: Option C.** The 2–3 highest-stakes signals are **asked directly** (a short
structured step the model cannot silently skip); the softer signals the model infers from the free
text and shows for confirmation.

**Why C over the alternatives (decision log):**

- **vs. a text-first "B + confirm" model** (model infers all signals; a confirm pops only when a
  high-stakes signal trips the tier up): B leaves a **silent false-negative gap** — the confirm only
  fires if the model *already* detected the signal, so a missed signal is never surfaced to the
  busy non-expert. C's always-ask floor closes that gap structurally. Closing B's gap (always
  surfacing the high-stakes questions) effectively turns B into "C with model pre-fill" anyway.
- **vs. a form-only model (A):** A is fully deterministic but sacrifices the "just ask it" feel that
  makes this the hero feature. C keeps the free-text experience for everything except the few
  signals that most drive risk.

**Upgrade path (why starting with C costs us nothing long-term):** evolving to the full free-text
experience later is **additive, not a rewrite** — the tier engine, the grounding, the data model,
and the output shape all stay identical; only a signal-*extraction* step, its evaluation
(`ai-evaluation`), and a confirm/pre-fill UX get added in front of the unchanged engine. This holds
**only because** signal-source and tier-decision are kept cleanly separated now. The safest
end-state is in fact "C's always-ask floor with the model pre-filling suggestions," which preserves
C's no-silent-miss guarantee while recovering most of the free-text feel.

### 3.3 The tier scheme (4 tiers, EU-AI-Act-aligned)

The tier ladder is anchored on the **EU AI Act's** risk-based structure (Reg. (EU) 2024/1689):
prohibited → high → limited → minimal. This is recognizable to a funder or board, is already half
present in our seeded rules (`euaiact-match-risk`: *"match safeguards to the level of risk… never
use AI for banned purposes"*), and maps cleanly to the product's three-way verdict.

> **Note on the standards library's `risk_tier`:** the schema comment records that
> `category / risk_tier are free text until Epics 1/4 settle their vocabularies (ADR-0008)`. The nine
> seeded rows currently tag `risk_tier` as `all`, `high`, or `sensitive` — a loose set, not a clean
> ladder. **Settling the tier vocabulary is Epic 4's job.** We do not modify those rows here; a
> later cleanup to align them with the four tiers below is a candidate Epic-1/4 follow-up.

| Internal tier | User-facing verdict | Meaning |
|---|---|---|
| **Prohibited** | **Don't** | Banned purpose / illegal — no safe version exists |
| **High** | **Use with conditions** (strong) — or **Don't** if no safe path | About a person / high-stakes domain / sensitive data → mandatory human approval + data minimization |
| **Limited** | **Use with conditions** (light) | Mostly fine; needs disclosure / provenance or a light check |
| **Minimal** | **Use** | Low-stakes — go ahead (baseline rules still apply) |

- **Tier is shown to the leader** as a small labeled badge (e.g., "High-risk under the EU AI Act
  framework") for transparency; the **verdict** stays the plain-language headline.
- The tier→verdict mapping above is **provisional** and will be finalized in decision #5 (output
  shape); the "High → Don't when no safe path exists" branch is where decision #2 (safer-way) plugs
  in.

### 3.4 The signals (what the engine reads)

Five plain yes/no signals, each grounded in a seeded `standard_rule` or an EU AI Act concept:

| # | Signal | Capture | Pushes toward | Grounded in |
|---|---|---|---|---|
| 1 | **Banned purpose?** (manipulation, social scoring, surveillance, illegal) | infer + always show | Prohibited | EU AI Act Art. 5; seeded `euaiact-match-risk` |
| 2 | **Judges / ranks / decides about a specific person?** | **always-ask** | High | responsible-AI third rail; seeded `euaiact-human-override`, `nist-human-oversight` |
| 3 | **High-stakes domain?** (health, legal, financial, housing/benefits, safety, crisis) | **always-ask** | High | EU AI Act high-risk; seeded `nist-check-output` |
| 4 | **Sensitive personal data involved?** (health, financial, case/service details, protected characteristics, info about vulnerable people — **not** a bare name/email) | **always-ask** | High | seeded `iso42001-data-governance` (tag `sensitive`) |
| 5 | **Output leaves the org?** (sent to the person served, a funder, or the public) | infer + show | Limited | seeded `euaiact-disclose-ai` (Art. 50) |

- **Always-ask floor = #2, #3, #4** — the three High-drivers, where a silent miss would drop a
  genuinely high-risk use to Minimal (the worst failure). These are asked directly so the model
  cannot skip them.
- **#1 and #5** the model infers from the text; #1 is always shown loudly (it's a hard stop), #5 is
  shown for confirmation.
- **Fail-safe:** any signal left unknown or ambiguous is treated as **"yes"** — it rounds the tier
  **up**, never down.
- **Why #4 is *sensitive* data, not any personal data:** tripping High on the mere presence of a
  name would flag every thank-you note and newsletter, training leaders to ignore the tool and
  violating Epic 5's "low false-positives" requirement. The ISO rule we ground on says *protect
  sensitive information* — so sensitivity, not presence, is the driver.
- **Deliberately *not* a signal:** "is a human already reviewing the output before it's used?" This
  belongs to the **safer-way** (decision #2) — it's a condition we can *recommend* to bring a High
  use down, not a fact about the use as described.

### 3.5 The mapping (deterministic, first-match-wins)

Rules are checked in order; the first match sets the tier. This ordering is what makes the engine
readable and auditable by a non-expert.

| Checked in order — first match wins | Tier |
|---|---|
| #1 Banned purpose | **Prohibited** |
| #2 Judges / ranks / decides a person | **High** |
| #3 High-stakes domain | **High** |
| #4 Sensitive personal data | **High** |
| #5 Output leaves the org | **Limited** |
| none of the above | **Minimal** |

**Worked examples:**

- *"Draft a donor thank-you from a name + gift amount, email it to the donor"* → no
  banned/person/high-stakes/sensitive signal; output leaves org → **Limited** (label it AI-assisted,
  human reviews). Consistent with the walking-skeleton thank-you Skill.
- *"Help write responses to clients in housing crisis"* → #3 high-stakes → **High** (needs the
  safer-way conditions before proceeding).
- *"Rank applicants by who's most likely to succeed"* → #2 judges a person → **High**, and likely #1
  (social scoring) → **Prohibited**. Surfaces loudly — the responsible-AI third rail.

### 3.6 Grounding and provenance (the no-fabrication guarantee)

This is what makes the trust claim real:

- Each **signal that fires carries its own `standard_rule` citation, attached by code from the
  matched row** — the LLM never selects, writes, or edits a citation.
  - #1 → `euaiact-match-risk` (Art. 5) · #2 → `euaiact-human-override` (Art. 14) +
    `nist-human-oversight` · #3 → `nist-check-output` · #4 → `iso42001-data-governance` ·
    #5 → `euaiact-disclose-ai` (Art. 50)
- The rules tagged **`risk_tier = all`** (human-oversight, disclosure, logging —
  `nist-human-oversight`, `nist-document-use`, `euaiact-disclose-ai`, `iso42001-managed-logging`,
  `iso42001-records`) **apply at every tier**. Even a Minimal use carries "a human has the final
  say, label it as AI, log it." (This is the home for the seed's `all` tag.)
- So every recommendation grounds in **tier-specific rules (the signals that fired) + the
  always-apply baseline**. The LLM's only job is to explain these in plain language and draft the
  safer-way.
- The Co-Pilot also checks the use against the **org's active policy** (Epic 1); where a policy rule
  applies, it is cited alongside the standard it derives from. (Policy-grounding detail to be
  finalized once Epic 1's `policy_rule` shape is confirmed — decision #2.)

### 3.7 Responsible-AI stance (how this decision satisfies the gate)

| Responsible-AI rule | How decision #1 meets it |
|---|---|
| Named accountable human (1) | The Accountable Leader decides on every assessment; the Co-Pilot only advises. |
| Rules written down; costly ones as ADRs (2) | This spec + the Proposed ADR below. |
| Disclose AI involvement (3) | Tier shown as a labeled badge; output provenance-labeled (via the pipeline). |
| Stakes & prohibited uses stated (4, 5) | Signal #1 → Prohibited is a hard refusal; signal #2 keeps AI off *judging the person* (third rail). |
| No ungrounded claim shown as fact (6) | Citations are code-attached from `standard_rule`; the LLM never invents them. |
| Bias / don't over-flag (7) | Signal #4 scoped to *sensitive* data to avoid crying wolf on benign tasks. |
| Human in the loop for consequential calls (9) | Always-ask floor + "advises, human decides"; High → mandatory human approval. |
| Guardrails defined (10) | Prohibited tier = refusal boundary; the mapping table *is* the policy limit. |
| Log AI use (11) | Every assessment logged (Epic 2), via the governed-run pipeline. |

**Out-of-scope handling** (feature 1, "points to a human rather than guessing"): when the engine
cannot land a confident tier (e.g., a use it has no signal coverage for), the verdict is **not** a
guess — it says so and defers to a human. Detailed behavior to be specified in decision #5.

### 3.8 Summary — what the code decides vs. what the LLM drafts

| Deterministic code (Domain layer) | LLM (via Data-Source) |
|---|---|
| Reads the structured signals | Helps infer the softer signals (#1, #5) from free text |
| Decides the tier (first-match table) | Explains the verdict in plain language |
| Attaches citations from matched `standard_rule` rows | Drafts the safer-way (decision #2) |
| Applies the always-apply baseline rules | — |
| Never delegated the verdict to the model | Never decides the tier; never picks a citation |

---

## 4. Decision #2 — the safer-way ("…and how")

### 4.1 What it is

Feature #2 `[Must]`: when a use is risky, offer **a concrete safer path** (strip data first, add
human review) so the leader reaches *"yes, safely"* instead of just *"no"* — and when there's **no
safe version**, a clear "don't." (Source: Notion "Epics and Features", Epic #4, feature 2.)

### 4.2 Core model — neutralize signals, re-tier, irreducible → Don't

The safer-way reuses decision #1's split (code decides, LLM only phrases):

- Each risk-driving **signal has a known mitigation**, drawn from a small **standards-grounded
  catalog** — not invented per use.
- Applying mitigations **re-runs the §3.5 engine with those signals neutralized** → a **projected
  tier** that is lower (e.g., High → Limited). The "safer" claim is thus *computed and provable*,
  not asserted.
- **Some signals are irreducible** → no safe path → **Don't**.
- The Co-Pilot **recommends**; it does not auto-apply. The projected tier is a **what-if**
  ("*if* you do X…"); the leader chooses to adopt it. The assessment + recommended mitigations are
  logged (Epic 2).

### 4.3 Mitigation catalog & reducibility

| Signal | Mitigation | Reducible? | Grounded in |
|---|---|---|---|
| #1 Banned purpose | — | **No → Don't** | `euaiact-match-risk` (Art. 5) |
| #2 Judges/ranks/decides a person | Restructure so **AI does the work, a human makes the judgment** | **Only this way** — if the goal *is* AI judging the person, irreducible → Don't | `euaiact-human-override`, `nist-human-oversight` |
| #3 High-stakes domain | Mandatory human review + careful output check + policy grounding | **Partially** — drops toward "use with conditions"; **human approval stays a floor** (can't reach Minimal) | `nist-check-output`, `euaiact-human-override` |
| #4 Sensitive data | Strip / minimize / anonymize before it reaches the AI | **Yes** — neutralized, tier drops | `iso42001-data-governance` |
| #5 Output leaves org | Human reviews & approves before sending; provenance label | **Yes** — neutralized | `euaiact-disclose-ai` (Art. 50) |

### 4.4 Ethics anchors (locked)

- **#2 — the third rail.** AI scoring/ranking/deciding *about a person* is **never made "safe" by
  mitigations.** The only acceptable move is to **take the judgment off the AI** (AI organizes the
  notes; a human decides who gets help). If the leader's goal is to have AI do the judging, the
  honest answer is **Don't**. (responsible-AI rule 5.)
- **#3 — high-stakes domains.** You cannot mitigate away a crisis/health/legal context, so **human
  approval is a permanent floor** — the safer-way lowers friction but never removes the human gate.
  (responsible-AI rule 9.)

### 4.5 Phrasing & grounding — the LLM's role

| Deterministic code | LLM (via Data-Source) |
|---|---|
| Picks which mitigations apply, from the fixed catalog, by which signals fired | Phrases the code-selected mitigations **concretely for this use** ("strip the client's name and case ID before pasting the notes") |
| Re-runs the engine with neutralized signals → the projected tier | — |
| Attaches each mitigation's `standard_rule` citation (code-attached, no fabrication) | Never adds a mitigation outside the catalog; never declares the risk cleared |

### 4.6 Honesty guardrails (against the loophole)

1. **No over-promising.** If a signal is only partially reducible (e.g., #3's approval floor), say so
   plainly; never show a projected tier lower than the engine actually returns.
2. **Irreducible → honest Don't.** If *any* irreducible signal remains, the overall answer is
   **Don't** — even when other signals were mitigable. No fake safer path around a hard stop.
3. **Recommend, don't auto-apply.** The projected tier is a what-if the leader adopts; the
   assessment and recommended mitigations are logged (Epic 2).

### 4.7 Showing the projected tier

**Decision: show the concrete projected tier** (e.g., "→ this would become *Limited*"), not just a
conditions list. It is the whole "provably safer, not merely reassuringly safer" value of the
feature, and it is honest because the **code computes it**. Minor cost: a little more UI complexity.

### 4.8 Worked examples

- *"Summarize client case notes for our internal records"* → #4 sensitive data → **High**.
  Safer-way: **strip names, case IDs, and identifying details before pasting** → re-run → #4 cleared,
  internal only → projected **Minimal** (baseline rules still apply).
- *"Email crisis-response drafts to clients"* → #3 high-stakes + #5 output leaves org → **High**.
  Safer-way: **add mandatory human review + approval before sending** (neutralizes #5; #3 keeps the
  approval floor) → projected **"use with conditions," human approval required** — cannot reach
  Minimal.
- *"Rank applicants by who's most likely to succeed"* → #2 judges a person (+ likely #1).
  Safer-way: **restructure so AI organizes the application info and a human decides priority** → #2
  cleared. If the leader insists AI does the ranking → irreducible → **Don't**.

---

## 5. Decision #6 — output shape

### 5.1 What it is

The **recommendation object** the Co-Pilot returns, and **how it is presented** to the leader. The
object is the contract the Domain engine hands to the Presentation layer (no logic in the UI — the
Leak Test); the UI only renders fields. (Source: Notion "Epics and Features", Epic #4; handover
decision "Output shape".)

### 5.2 The recommendation object (Domain → Presentation contract)

Structured, not a prose blob — so citations stay welded to claims as data, and the LLM only fills
the plain-language **text** slots. The UI parses nothing.

| Field | What it holds | Source |
|---|---|---|
| `verdict` | `use` / `use_with_conditions` / `dont` / `out_of_scope` | code (from tier) |
| `tier` | `minimal` / `limited` / `high` / `prohibited` / `undetermined` | code (§3.5 engine) |
| `tierLabel` | plain badge text, e.g. "High-risk · EU AI Act framework" | code |
| `summary` | one-line plain-language "why" | LLM (phrasing only) |
| `signals[]` | each detected signal: `{ key, value, source: asked \| inferred }` | code (asked) + LLM (inferred, shown to confirm) |
| `reasons[]` | one per *fired* signal: `{ signalKey, plainText, citations[] }` | LLM writes `plainText`; code attaches `citations` |
| `baselineRules[]` | the always-apply (`risk_tier = all`) rules that hold at every tier | code |
| `saferWay` | when risky: `{ mitigations[]: {plainText, neutralizesSignal, citations[]}, projectedTier, projectedVerdict }` | code selects + re-tiers; LLM phrases |
| `provenanceLabel` | "AI-assisted — a person decides" (+ the pipeline's label) | code |
| `humanDecisionRequired` | boolean — true for High / Prohibited and all consequential calls | code |
| `assessmentId` | the logged assessment's id (Epic 2 audit trail) | code |

Decisions baked in: **reasons are structured** (one per fired signal, each carrying its own
citation — no "which cite backs which point" ambiguity), and **`out_of_scope` is its own verdict**
(with `tier = undetermined`) so the engine never emits a fake tier when it can't responsibly answer
(feature #1, "point to a human rather than guessing").

### 5.3 verdict ↔ tier mapping (finalized)

| tier | verdict | notes |
|---|---|---|
| `prohibited` | `dont` | hard stop; no safe path |
| `high` | `use_with_conditions` — or `dont` if irreducible (§4) | human approval always required |
| `limited` | `use_with_conditions` (light) | disclosure / provenance / light check |
| `minimal` | `use` | baseline rules still apply |
| `undetermined` | `out_of_scope` | can't responsibly answer → point to a human |

### 5.4 Presentation — what the leader sees

Governing rules: **lead with the decision, unfold detail on demand** (Nielsen: obvious next step;
recognition over recall), and **never signal the verdict by color alone** (WCAG 1.4.1 — every tier
carries an icon + text label).

Top-to-bottom layout:

1. **Verdict headline** — big, plain words + icon + text label ("Use with conditions" / "Don't use
   AI for this" / "Go ahead" / "This needs a person — here's who"). Never jargon; never color-only.
2. **One-line why** (`summary`).
3. **Tier badge** — small, supporting ("High-risk · EU AI Act framework"); text label, not a bare
   colored dot.
4. **The safer-way** (when risky) — shown **prominently, not hidden**: the mitigations → the
   projected tier. For `use_with_conditions`, usually the main thing on screen.
5. **Reasons + citations** — the structured `reasons[]`, each expandable to "which standard backs
   this" (progressive disclosure — grounding one click away, never buried).
6. **The human-decision line** — explicit: "You decide — the Co-Pilot advises. This needs your
   sign-off before it's used." (responsible-AI rule 9, made visible.)
7. **Provenance + logged** — "AI-assisted. Saved to your AI-use registry." (disclosure + audit,
   Epic 2.)

**Primary action per verdict** (the obvious next step):

| Verdict | Prominent primary action | Secondary |
|---|---|---|
| `use` | Proceed to the task | — |
| `use_with_conditions` | **Apply the safer way** | Proceed with a human review |
| `dont` | **Ask a person** (no "proceed" button offered) | Close |
| `out_of_scope` | **Who to ask** (point to a human) | Close |

Deliberate omissions: **no "proceed" button on `dont`** (don't make the unsafe path easy — mirrors
Epic 6's "make the safe path the easiest path"); for `use_with_conditions`, the safer way is the
*primary* action, not an afterthought.

**Progressive disclosure, with a firm exception:** the **tier, verdict, safer-way, and
human-decision line are never collapsed** — only the supporting reason detail and full citations sit
behind expanders. The consequential parts stay unmissable; the first view stays calm for a
non-expert.

### 5.5 Cross-cutting notes

- **UX:** plain language over jargon; the whole ask → assess → decide → act/log flow is designed,
  not one screen; visible loading/success/error states when the assessment runs.
- **Accessibility:** icon + text label for verdict/tier (no color-alone); semantic headings;
  expanders keyboard-operable with visible focus; contrast ≥ 4.5:1. Custom disclosure widgets to be
  manually keyboard/screen-reader tested before done.
- **Responsible-AI:** disclosure and the human gate are on-screen, not implied; citations are
  code-attached (no fabrication); out-of-scope defers rather than guesses.

---

## 6. Decision #3 — grounding & provenance

### 6.1 What it is

How the Co-Pilot grounds its advice in **two sources** — the org's **active policy** (Epic 1) and
the **standards library** (Epic 0) — and how it shows **which source backs each point**. (Sources:
ADR-0009 policy-seed data model; ADR-0008 standards library; Epic #4 feature 4.)

### 6.2 Two stacked sources (a floor plus additive policy)

- **Standards library = the universal safety floor.** The deterministic tier engine (§3.5) is
  grounded here, so every org gets baseline-safe advice **even with no policy** (Epic 8's free
  baseline-safety tier). Read via `studio/lib/data/standards.ts` (global read-only catalog).
- **Org active policy = additive.** The one `active` policy per org (ADR-0009), and its atomic
  `policy_rule` rows — *each itself standards-grounded* (it snapshots `standard_rule_id` + a
  point-in-time `citation`). Read via a new Data-Source accessor, **org-scoped RLS, the `task_run`
  tenancy pattern** (ADR-0009 / ADR-0003) — mirroring `standards.ts`, no DB in Domain/UI (Leak Test).
- **Graceful degradation (ADR-14):** no `active` policy yet → ground in standards alone and **say
  so** ("grounded in baseline standards; you haven't set your org policy yet"); a read error returns
  `[]`, same as `standards.ts`.

### 6.3 Policy tightens freely; relaxes only above the hard floor

The two sources are not peers — they stack, and policy can move the result in both directions with
one hard limit:

- **Tighten (always allowed):** policy adds org-specific rules or strengthens the baseline; a use
  conflicting with a policy rule raises the verdict (toward conditions / don't), with the policy
  rule cited.
- **Relax = risk acceptance with accountability:** the named accountable leader may **accept** a
  `Limited` / `High` flag and proceed — but only **logged with a reason** (Epic 2) and **honestly
  labeled** ("accepted against the [standard] recommendation"). The org's policy may pre-set standing
  acceptances so the leader isn't re-asked each time. (Real governance practice: NIST risk
  acceptance; EU AI Act high-risk = allowed with safeguards.)
- **The hard floor — never relaxable:** `Prohibited` (illegal / banned purposes — EU AI Act Art. 5),
  the **third rail** (AI judging/ranking a person), and any **`is_baseline_safety`** policy rule
  (ADR-0009 built that flag to be non-overridable). A use conflicting with an `is_baseline_safety`
  rule is a **hard `Don't`** (treated like an irreducible signal, §4).

### 6.4 Citation precedence — policy-first, standards-backed, standards-fallback

When citing a point, the code picks the source in this order:

1. **An active policy rule covers it** → cite the **policy rule**, surfacing its standard underneath:
   *"Your AI policy: [rule_text] — based on [EU AI Act Art. 14]."*
2. **No policy rule covers it** → cite the **standards library** directly (current version):
   *"Baseline standard: [NIST MEASURE]."*
3. **Custom policy rule** (`standard_rule_id` null, `origin = custom`) → *"Your organization's own
   rule"* (honest: not every policy rule has a standard).
4. **An accepted/relaxed risk** → *"Risk accepted by [leader] on [date] — against the [standard]
   recommendation."*

Policy-first (over standards-first) so the leader sees their policy *actually being used* (Epic 1's
"living policy"); the standard is always one expander away (§5.4 progressive disclosure).

### 6.5 Provenance labels — origin-tagged, honest, no fabrication

Each `reasons[].citations[]` (§5.2) is tagged by `policy_rule.origin`:

| Source | Label |
|---|---|
| policy rule, `origin = standard` | "Your AI policy (based on [standard])" |
| policy rule, `origin = baseline` | "Your AI policy — baseline safety · non-overridable (based on [standard])" |
| policy rule, `origin = custom` | "Your organization's own rule" |
| standards library (no policy rule) | "Baseline standard: [standard]" |
| accepted risk | "Risk accepted — against [standard] recommendation" |

**No-fabrication guarantee (as in §3.6 / §4.5):** every citation string comes from
`policy_rule.citation` (snapshot) or `standard_rule.citation` (code-attached). The LLM phrases
`rule_text` / reasons but **never writes or edits a citation**.

### 6.6 Snapshot vs. current version (feature #4)

ADR-0009 **snapshots** `policy_rule.citation` at generation (point-in-time), while standards reads
are **live**. They do different jobs and don't conflict:

- The **verdict/tier** is grounded in the **live** standards engine (§3.5) → advice always reflects
  the current standard (satisfies feature #4 `[Should]`).
- A **policy citation** shows the org's **snapshot** — honest to what they adopted.
- *(1b refinement, not 1a:)* when a live standard has moved past a policy rule's snapshot, flag
  "your policy cites an older version."

### 6.7 Cross-cutting notes

- **responsible-AI:** grounding against fabrication (rule 6), provenance/disclosure (rule 3),
  accountable+logged risk acceptance (rules 9, 11), the non-relaxable hard floor (rule 10).
- **judge-arch:** both reads live in Data-Source accessors (org-scoped RLS for policy, read-only
  catalog for standards), never Domain/UI (ADR-0003).
- **secure-coding:** org-owned policy data under RLS — the table/grant mechanics are decision #5
  (data model), per ADR-0009's `task_run` pattern.

---

## 7. Decision #5 — data model (`copilot_assessment`)

### 7.1 What it is

The tables a Co-Pilot assessment needs — **design only** (the migration is written later by whoever
builds Epic 4). Org-owned, under org-scoped RLS. Grounded in the real core schema
(`20261110000000_phase0_core_schema.sql`) and ADR-0009's tenancy pattern.

### 7.2 Key insight — an assessment **is a `task_run`**

The core schema already reserves our table (*"the approval / **copilot_assessment** /
policy_suggestion tables arrive in Phase 1"*) and `skill_type` already includes **`copilot`**. So a
Co-Pilot assessment **runs through the existing pipeline** → it creates a **`task_run`** (the
`copilot` skill), reusing `org_id`, `run_by`, `status`, `input_summary`, the org-scoped RLS, and the
`audit_event` log. **`copilot_assessment` is to the Co-Pilot what `task_output` is to a Skill** — a
1:1 child of `task_run`. No new tenancy/audit/RLS machinery (judge-arch single source of truth; YAGNI).

### 7.3 `copilot_assessment` columns (persists the §5.2 object)

| Column | Holds |
|---|---|
| `id` | PK (the `assessmentId` the output object carries) |
| `task_run_id` | FK → `task_run` (parent; org/actor/status live there) |
| `verdict` | enum `use` / `use_with_conditions` / `dont` / `out_of_scope` |
| `tier` | enum `minimal` / `limited` / `high` / `prohibited` / `undetermined` |
| `recommendation` | **jsonb** — the structured object: `signals[]`, `reasons[]` (code-attached citations), `baselineRules[]`, `saferWay`, `tierLabel`, `summary` |
| `policy_id` | FK → `policy` (nullable) — which active policy was in effect (provenance snapshot) |
| `provenance_label`, `human_decision_required` | as in §5.2 |
| `created_at` | timestamp |

**jsonb (not normalized child tables):** the recommendation is a read-mostly, point-in-time snapshot
rendered as a unit (like ADR-0009's snapshotted citation); normalizing buys SQL-queryability
(e.g. "all assessments citing NIST-X") we don't need in 1a (YAGNI). Revisit if Epic 7 funder
reporting needs that query early.

### 7.4 RLS + least privilege (ADR-0009's child-via-parent)

- **Org-scoped via its parent `task_run`** (the `task_output`→`task_run` pattern) — no separate
  `org_id`; one source of truth for tenancy.
- **`SELECT` + `INSERT` only; no `UPDATE`, no `DELETE`** — an assessment is an **immutable record**;
  re-asking creates a new `task_run` + `copilot_assessment` (non-destructive, versioned-by-new-row,
  as ADR-0009's policy).
- Writes as the signed-in user via `current_org_id()`; **no service-role key** (ADR-0007/0009).

### 7.5 Risk-acceptance record (from §6.3)

- **Reuse the `task_status` flow:** a risky verdict → `needs_review`; leader **accepts & proceeds** →
  `approved`; **declines** → `rejected`. No new state machine.
- **Acceptance details** (insert-only, since the assessment is immutable): `task_run_id` (or
  `copilot_assessment_id`), `decided_by` FK → `profile`, `decision` (`accepted` / `declined`),
  `reason` text, `created_at`.
- **Unify with Epic 5, don't build twice:** Epic 5's "human approval / review step" needs this same
  record for Skills. The design fixes the fields; whoever builds Epic 4/5 makes it one shared
  "human decision on a run" table (judge-arch single source of truth).

### 7.6 Audit events (reuse append-only `audit_event`; no sensitive content — ADR-6)

- **`copilot_assessed`** — payload `{ verdict, tier, status }` (like the pipeline's `task_completed`).
- **`risk_accepted` / `risk_declined`** — payload `{ assessment_id, decision }`.
- The acceptance **`reason` never enters the audit payload** (it could be sensitive) — it lives only
  in the RLS-protected decision record (secure-coding rule 8 + ADR-6).

### 7.7 Sensitive-data handling

The leader's **use description can carry PII**. By design: **signals** are yes/no (no PII);
**reasons** are *categorical* ("this involves sensitive data"), not the raw data; the **audit log**
carries no content. Retention/erasure of the raw `input_summary` is **deferred to Phase 1** (the core
schema already defers right-to-erasure) — flagged, not solved here.

### 7.8 Reserved hooks

`task_run.policy_id` (which active policy applied) lands with Epic 1's "policy-inheritance
mechanism" ticket; `copilot_assessment.policy_id` snapshots it for provenance. Migrations are
additive, so the nullable FKs are cheap to add when those tickets land.

### 7.9 Cross-cutting notes

- **secure-coding:** org-scoped RLS (rule 1), least-privilege SELECT+INSERT/immutable (rule 9), no
  service-role key, no PII in logs (rule 8).
- **judge-arch:** reuse `task_run` as the tenancy/audit single source of truth; one unified
  human-decision record; all access via Data-Source (ADR-0003).
- **responsible-AI:** accountable human + logged decision (rules 9, 11); audit without content.
- **technical-planning:** the schema is costly-to-reverse → captured in the Proposed ADR.

---

## Proposed ADR (to be numbered when Epic 4 is built)

**Title:** Transparent risk-tiering as deterministic Domain-layer code, grounded in the standards
library.

**Status:** Proposed (design). Costly-to-reverse — it is the product's core trust claim.

**Context:** The Governance Co-Pilot must give an Accountable Leader a defensible, auditable verdict
on whether to use AI for a task. A black-box model verdict cannot be explained or audited.

**Decision:**
1. The risk **tier** is decided by deterministic Domain-layer code from a fixed, first-match
   signal→tier table (§3.5), never by the model.
2. The tier ladder is four tiers aligned to the EU AI Act (Prohibited / High / Limited / Minimal),
   mapped to the three user-facing verdicts (§3.3).
3. Signals are captured via Option C: the three High-driver signals (#2/#3/#4) are asked directly;
   #1/#5 are model-inferred and shown. Unknown signals round the tier up.
4. Citations are attached by code from matched `standard_rule` rows; the LLM only explains and
   drafts the safer-way. `risk_tier = all` rules apply at every tier.
5. The Co-Pilot advises; a named human decides. Prohibited is a hard refusal boundary.
6. **The safer-way** is a standards-grounded mitigation catalog mapped to signals; applying
   mitigations re-runs the tier engine to produce a **computed projected tier** (shown to the
   leader). The LLM only phrases mitigations concretely; it never invents one or clears risk.
7. Irreducible signals (banned purpose; AI-judging-a-person the leader won't restructure) have **no
   safe path → Don't**. High-stakes domains keep **human approval as a permanent floor**.
8. **Output** is a structured recommendation object (§5.2) with a finalized verdict↔tier mapping
   (§5.3); `out_of_scope` is a first-class verdict. Presentation leads with the plain-language
   verdict, shows the safer-way prominently, never signals by color alone, offers **no "proceed" on
   `dont`**, and keeps verdict/tier/safer-way/human-decision uncollapsed.
9. **Grounding** stacks two sources: the standards library is the universal safety floor; the org's
   active policy is additive. Policy **tightens freely** and may **relax only above a hard floor**
   via logged, accountable risk acceptance — `Prohibited`, the third rail, and `is_baseline_safety`
   rules never relax. Citations are **policy-first, standards-backed, standards-fallback** (§6.4),
   origin-tagged and code-attached (no fabrication). The verdict uses live standards (feature #4);
   policy citations show ADR-0009's snapshot.
10. **Data model:** an assessment is a `task_run` (the `copilot` skill) plus an immutable
    `copilot_assessment` child (recommendation as `jsonb`), org-scoped via the parent (ADR-0009
    child-via-parent RLS), SELECT+INSERT only. Risk acceptance reuses `task_status`
    (`needs_review` → `approved`/`rejected`) with an insert-only decision record (`decided_by`,
    `decision`, `reason`) that **unifies with Epic 5's approval table**. Audit via `audit_event`
    (`copilot_assessed`, `risk_accepted/declined`) with **no reason text / no content** (ADR-6).

**Consequences:** Every verdict is explainable and reproducible; citations cannot be fabricated. The
first release carries modest up-front friction (three yes/no questions) in exchange for
defensibility. The design preserves a cheap, additive upgrade to a fuller free-text experience by
keeping signal-source separated from tier-decision.

---

## Open questions / to verify

- [ ] Confirm the exact Build Plan wording for "transparent risk-tiering" (sourcing flag, §1).
- [ ] Specify the *content* of out-of-scope guidance ("who to ask") per org (decision #6). (The out-of-scope verdict and behavior are designed — §5.)
- [ ] Confirm the risk-acceptance record **unifies with Epic 5's human-approval table** when Epic 5 is designed (fields fixed in §7.5); design the standing-acceptance (pre-set policy acceptance) mechanism.
- [ ] Retention / right-to-erasure for `task_run.input_summary` (deferred to Phase 1, §7.7).
- [ ] (1b) Flag when a live standard has moved past a policy rule's snapshotted citation (§6.6).
- [ ] Decide whether the seeded `risk_tier` loose tags are realigned to the four tiers (Epic-1/4 follow-up; DB change — not here).

## Sourcing notes

- Epic 4 feature list and scenarios: Notion "Epics and Features" page, Epic #4 (read 2026-11-13).
- Seeded rules, categories, `risk_tier` tags, and citations: `studio/supabase/migrations/
  20261113010000_seed_standards.sql` and `..._standards_library_tables.sql` (read directly).
- EU AI Act tier structure (Reg. (EU) 2024/1689): via the `responsible-ai` skill's cited standards.
- Layering / pipeline: ADR-0003; `studio/lib/domain/pipeline.ts`.
- Rule text in the standards library is **our plain-language synthesis**, not quoted from the
  frameworks (per the seed migration's own header); citations point to the source at the precision
  we can verify.
