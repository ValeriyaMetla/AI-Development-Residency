# Week 5 — Manual Test Case Scenarios (Governed AI Ladder)

> Two manual test cases for the checks a script can't make: UX flow, judgment, and trust.
> Run on the live app: https://ai-development-residency-nine.vercel.app
>
> **Source of truth:** the Notion page *Week 5 Manual Test Case Scenarios — Governed AI Ladder* and
> the two Kanban cards *W5 — Run manual QA: policy seed and activation* and
> *W5 — Run manual QA: Co-Pilot consequential-use flow*. This file mirrors them.
>
> **Status:** Executed 2026-11-22 — both cases **Pass (11/11 each)**. Run by Claude in the Claude
> desktop built-in browser on Valeriya's behalf; Valeriya created the test account. Valeriya to
> confirm or re-run personally. One finding (F-1) and two UX observations are under
> [Findings](#findings).
>
> **Safety rule:** fictional information only — never real client, staff, donor, applicant, health,
> financial, contact, or other sensitive information.

---

## Test Case 1 — Policy Seed and Activation

### Traceability
- **User requirements:** L1 — accountable with nothing to stand on; L3 — governance costs too much
  and takes too long.
- **BDD source:** F1.1 Policy Seed, happy path and skipped-optional-answer edge case.
- **Manual focus:** understandable flow, visible safe defaults and grounding, explicit human
  activation, persistence, and live UI behavior.

### Use Case Scenario Being Tested
As an Accountable Leader at a small nonprofit with no current AI policy, I want to complete a short,
self-service policy seed and explicitly adopt the resulting draft so that my organization has
understandable, standards-grounded rules without hiring a consultant.

### Test Case Scenario Being Tested
On the production Vercel application, a signed-in Accountable Leader completes the policy-seed
intake using fictional organization information, deliberately skips or selects "Not sure" for one
optional answer, reviews the generated draft and its review cues, explicitly activates it, and
confirms the dashboard shows an active policy.

### Pre-Conditions
1. The Week 5 changes have been merged and the matching Vercel production deployment is successful.
2. The tester has a clean Accountable Leader test account for a fictional organization with no
   active policy.
3. The tester can sign in to the production application.
4. Only fictional test information will be entered.
5. Fictional context: organization = "Harbor Community Network"; uses of AI = donor thank-you
   drafts, internal communications, and program-summary drafts; person-impacting decisions must
   remain human decisions.
6. A timer is available. Record the browser, device or viewport, operating system, test date, and
   deployed version or commit if available.

### Steps
1. Record the test environment and start the timer.
2. Open the production URL.
3. Sign in with the clean Accountable Leader test account.
4. From the dashboard, locate and start the policy-seed flow.
5. Confirm the intake explains the task and shows progress through the questions.
6. Answer each required question using the fictional organization context.
7. For one optional question, deliberately choose "Not sure," skip it, or leave it unanswered as the
   interface permits.
8. Continue through the remaining questions and submit the completed seed.
9. Wait for the draft policy to be generated without refreshing or navigating away.
10. Review the draft policy: confirm it is still a draft, the rules are written in plain language,
    and the skipped answer is represented by a visible assumption, safe default, or needs-review cue.
11. Inspect the draft for visible standards grounding or source citations and any indication that
    human review is still required.
12. Use the explicit activation control to adopt the draft policy.
13. Return to the dashboard.
14. Refresh the dashboard once and confirm the active-policy state persists.
15. Stop the timer and record any confusing language, delay, error, clipped layout, keyboard/focus
    issue, or other usability observation.

### Expected Results
1. The live application loads without a production error and accepts the valid test-account session.
2. The Accountable Leader can find and start the policy seed without outside help.
3. The intake presents a clear sequence and progress indication.
4. Required fictional answers are accepted, while one optional answer can be skipped or marked
   uncertain without blocking completion.
5. The application generates a policy in draft status; it does not silently activate the policy.
6. The draft contains understandable, plain-language rules grounded in visible sources or standards.
7. The skipped or uncertain answer produces an honest, visible safe-default, assumption, or
   needs-review indication rather than an unstated guess.
8. The interface makes clear that a human must review and choose whether to activate the draft.
9. Activation occurs only after the tester deliberately selects the activation control.
10. The dashboard then shows the policy as active, and that state remains after refresh.
11. The end-to-end flow can be completed in approximately five minutes, excluding time deliberately
    spent taking QA notes.
12. No sensitive information is exposed, no page becomes unusable, and no unexpected error occurs.

### Actual Results

| Step | What did you do / input? | What should happen? | What actually happened? | Pass or Fail? | Notes / evidence |
|---|---|---|---|---|---|
| 1 | Record environment and start timer | Test context and start time are captured | Environment recorded (see execution record); timer started 15:59:04 PST on the first signed-in screen | Pass | Account was created immediately before the test (setup, not timed) |
| 2–3 | Open production and sign in | App loads and valid Accountable Leader reaches the dashboard | App loaded and the session was accepted. A new org lands on `/setup` ("Get set up — 1 of 3 steps done"); `/dashboard` redirects there until setup is finished or skipped | Pass | First screen is the setup checklist, not the dashboard — appears intentional for a new org |
| 4–5 | Start policy seed and inspect orientation/progress | Seed is easy to find and the sequence is understandable | Found as "Step 2: Set your AI rules" on the setup checklist. Intro explains the task ("Takes about five minutes"); "Step 1 of 7" label and progress bar; a "Use recommended answers" shortcut is offered | Pass | — |
| 6 | Enter fictional required answers | Valid answers are accepted | Q1 QA Test Leader / Executive Director; Q2 Drafting emails, letters, or communications + Summarizing documents or notes; Q3 sensitive information = Yes; Q4 higher-stakes = No. All accepted; Next stays disabled until each required answer is given | Pass | After Q4 = No the counter changed from "of 7" to "Step 5 of 6" (reviewer question dropped) |
| 7 | Skip or mark one optional answer "Not sure" | The flow permits the optional uncertainty without blocking | Chose "Not sure" on optional Q5 (AI content shared outside the org; labelled "You can skip this"). Next stayed enabled and the flow continued | Pass | Q6 custom limit added: "Decisions that affect a person stay with a human." |
| 8–9 | Submit and wait for generation | A draft policy generates without an unexpected error | Button showed "Generating…"; the draft appeared in about 10 seconds without refreshing | Pass | No console errors |
| 10 | Review draft status, rules, and skipped-answer cue | Draft remains unactivated; rules are plain-language; safe default or review cue is visible | "Review your starter policy — We drafted 10 rules from your answers — 1 flagged for your review." The transparency rule carries an orange **Needs review** badge, explained as "We filled this in from a default answer" | Pass | The page does not use the word "draft"; it says "Review… then activate" |
| 11 | Inspect grounding and human-review cues | Sources or standards and the user's review responsibility are understandable | Every rule shows "Based on …" with NIST AI RMF (2023), ISO/IEC 42001:2023, or EU AI Act Art. 5 / Art. 50. Always-on rules are badged "Safety floor — always on"; the custom rule is badged "Added by your team" | Pass | — |
| 12 | Activate the draft | Activation requires a deliberate user action and succeeds | Clicked "Activate this policy" → "Your AI policy is active — It now applies to your organization's AI use." | Pass | Nothing activated before the click |
| 13–14 | Return to and refresh dashboard | Dashboard shows the active policy and the state persists | Setup showed "2 of 3 steps done". After "Skip for now — go to Home", Home showed "Policy active"; still shown after one refresh | Pass | Reaching Home requires skipping setup step 3 |
| 15 | Stop timer and assess usability | Flow remains usable; observations and elapsed time are recorded | Timer stopped 16:01:35 PST (2 min 31 s). No errors, no clipped layout; keyboard focus moved to each new question | Pass | Automated run; a person reading each screen will take longer |

### Execution record
- **Test date/time:** 2026-11-22, 15:59:04–16:01:35 PST
- **Tester:** Claude (Opus 5.5) in the Claude desktop built-in browser, on Valeriya's behalf (test
  account created by Valeriya)
- **Production URL:** https://ai-development-residency-nine.vercel.app
- **Deployment/commit:** `7db391a` (head of `main`); the Vercel deployment itself was not checked
  separately
- **Browser and version:** Chromium 156.0.8078.100 (Claude desktop built-in browser)
- **Device, operating system, and viewport:** MacBook, macOS 26.6.2, 666 × 640
- **Elapsed time:** 2 min 31 s
- **Overall result — Pass or Fail:** Pass
- **Passed steps / total steps:** 11 / 11
- **Pass percentage:** 100%
- **Actual-result summary:** The seed is easy to find; required answers are enforced; the "Not sure"
  answer became a labelled "Needs review" rule; every rule cites a named standard; activation
  required a deliberate click; "Policy active" persisted after refresh. UX notes: the step total
  changes mid-flow (7 → 6), and a new org reaches Home only by skipping setup step 3.
- **Bug ticket link(s), if any:** None

---

## Test Case 2 — Co-Pilot Consequential-Use Flow

### Traceability
- **User requirement:** L4 — prevent harmful AI output from reaching the people served and keep a
  human in control of consequential decisions.
- **BDD sources:** F4.1 advisory, F4.2 safer-way recommendation, and F4.4 standards grounding.
- **Manual focus:** comprehension and trust, consistency of the risk result, visible human authority
  and standards grounding, safer-way guidance, and mobile usability.

### Use Case Scenario Being Tested
As an Accountable Leader, I want the Governance Co-Pilot to evaluate a proposed consequential use of
AI, explain the risk in plain language, preserve human authority, and offer a safer approach so that
the organization does not automate a decision that could harm a person.

### Test Case Scenario Being Tested
On the production application in a physical-phone or phone-sized viewport, a signed-in Accountable
Leader asks whether AI should automatically rank fictional emergency-housing applicants using
sensitive case information and choose who receives assistance. The tester reviews the tier,
recommendation, rationale, standards citations, human-decision requirement, safer-way or
no-safe-path guidance, and responsive presentation.

### Fixed fictional test input
> Our fictional nonprofit is considering using AI to rank applicants for emergency housing and
> automatically decide who receives assistance. The system would use case notes that may include
> health, disability, family, and financial information. Should we do this?

Do not add real names, case histories, contact details, or other sensitive information.

### Pre-Conditions
1. The Week 5 changes have been merged and the matching Vercel production deployment is successful.
2. The tester has a valid Accountable Leader test account with an active policy.
3. The tester can sign in to the production application.
4. The test will be run on a physical phone or a browser viewport approximately 390 × 844 pixels;
   record the exact device or viewport.
5. Only the fixed fictional prompt above will be used.
6. Record the browser, operating system, test date, and deployed version or commit if available.

### Steps
1. Record the test environment and set the physical phone or browser to the chosen phone-sized
   viewport.
2. Open the production URL and sign in with the Accountable Leader test account.
3. Open the Governance Co-Pilot.
4. Confirm the prompt, instructions, and submission control are readable and usable without
   horizontal scrolling or clipped controls.
5. Enter the fixed fictional test input exactly as written above.
6. Submit the assessment once.
7. Observe the loading state and wait for the result without submitting a duplicate request.
8. Review the displayed risk tier and the use / use-with-conditions / don't recommendation.
9. Review the plain-language reasons and confirm they relate to the person-impacting decision and
   sensitive information described in the prompt.
10. Confirm the result does not authorize AI to make the final housing-assistance decision and that
    human decision-making remains explicit.
11. Inspect the result for visible standards citations or grounding.
12. Review the safer-way guidance or no-safe-path message.
13. Check whether the safer guidance is concrete — for example, limiting AI to de-identified
    administrative support or summaries while humans apply documented criteria and make the decision.
14. Review the whole result on the phone-sized screen for readable text, usable controls, sensible
    wrapping, and absence of overlap or horizontal scrolling.
15. Navigate back to the dashboard, then return to the Co-Pilot to confirm navigation remains usable.
16. Record whether the recommendation was understandable and trustworthy, plus any delay, error,
    clipped content, focus issue, or other usability observation.

### Expected Results
1. The live app and Co-Pilot route load without a production error and remain usable at phone size.
2. The fictional prompt is accepted once, with a visible loading state or other clear feedback while
   processing.
3. The result does not give an unsafe unconditional "use" recommendation for automated housing
   eligibility or ranking.
4. The risk tier, recommendation, and rationale are internally consistent and understandable in
   plain language.
5. The reasons reflect the consequential, person-impacting nature of the use and its sensitive-data
   context.
6. The result clearly keeps the final decision with a human; it does not endorse automated ranking,
   scoring, or eligibility decisions about people.
7. Visible citations or standards grounding support the recommendation.
8. The result either clearly recommends against the proposed automated decision or provides
   conditions that remove the unsafe decision-making role from AI.
9. Any safer-way guidance is concrete and actionable.
10. All important content and controls remain readable and operable without overlap, clipping, or
    horizontal scrolling on the phone-sized screen.
11. Back and return navigation work without losing basic app usability.
12. No real or sensitive information is entered or exposed.

### Actual Results

| Step | What did you do / input? | What should happen? | What actually happened? | Pass or Fail? | Notes / evidence |
|---|---|---|---|---|---|
| 1–2 | Record environment, set phone viewport, open production, and sign in | Live app loads and remains usable at phone size | Viewport 390 × 844; Home loaded showing "Policy active"; page width 390 with no horizontal scroll | Pass | At phone size the primary nav is hidden; the full menu sits under the avatar ("Account menu"), which is not obvious |
| 3–4 | Open Co-Pilot and inspect the prompt UI | Prompt and controls are readable, reachable, and not clipped | "Should we use AI for this?" with a description box, 6 quick risk questions, and "Get advice". Everything wraps; nothing is clipped | Pass | Script gap: the Co-Pilot also asks 6 risk questions that the script did not anticipate |
| 5–7 | Enter the fixed fictional prompt, submit once, and wait | Input is accepted; processing feedback is clear; no duplicate request is needed | Entered the fixed prompt exactly (261 characters) and ticked the true risk questions: judges/ranks a person, high-stakes area, sensitive personal data. Submitted once; the button became "Checking…" and was disabled; result arrived in under 10 seconds | Pass | Disabling the button prevents a duplicate request |
| 8 | Review tier and recommendation | Result avoids unsafe unconditional approval and uses a clear recommendation | "Use with conditions" with badge "High-risk (EU AI Act framework)" | Pass | — |
| 9 | Review reasons | Reasons are plain-language and relevant to the risk signals in the prompt | Names ranking and deciding emergency housing and the health, disability, family, and financial details; calls for "real human oversight rather than automatic decisions" | Pass | — |
| 10 | Check human authority | Result keeps the person-impacting decision with a human | "A person must approve" badge; footer "AI-assisted governance advice — a person decides." | Pass | — |
| 11 | Inspect citations/grounding | Visible standards or sources support the recommendation | "Why — and the standards behind it" lists EU AI Act Art. 14, NIST AI RMF (GOVERN, MEASURE), and ISO/IEC 42001 Annex A per risk signal, plus the always-applicable baseline | Pass | See finding F-1: the org's own "won't score, rank, or judge people" rule is not cited |
| 12–13 | Review safer-way or no-safe-path guidance | Guidance is concrete, consistent with the recommendation, and removes unsafe automated decision-making | "Restructure so the AI only does the work (organizing, drafting) and a person makes the judgment about people"; mandatory human review; "Strip, minimize, or anonymize the sensitive details before they reach the AI." | Pass | Then says "If you apply these, this would become High-risk" — the same tier (see O-2) |
| 14 | Inspect the full mobile result | Text and controls wrap correctly with no overlap or horizontal scrolling | No element extends past 390 px; the expandable section works; badges wrap | Pass | — |
| 15 | Navigate back and return | Navigation works and the app remains usable | Home via the account menu, then back via "Ask the Co-Pilot →"; the Co-Pilot reloaded cleanly | Pass | The previous result is not kept after leaving (expected) |
| 16 | Assess comprehension and trust | Tester records whether the result was understandable and trustworthy | Understandable: yes. Trustworthy: partly — see F-1 | Pass | — |

### Execution record
- **Test date/time:** 2026-11-22, 16:01:45–16:03:33 PST
- **Tester:** Claude (Opus 5.5) in the Claude desktop built-in browser, on Valeriya's behalf
- **Production URL:** https://ai-development-residency-nine.vercel.app
- **Deployment/commit:** `7db391a` (head of `main`); the Vercel deployment itself was not checked
  separately
- **Browser and version:** Chromium 156.0.8078.100, mobile emulation (Android / Pixel 8 user agent)
- **Device, operating system, and viewport:** Emulated phone, 390 × 844, on macOS 26.6.2 — not a
  physical phone
- **Overall result — Pass or Fail:** Pass
- **Passed steps / total steps:** 11 / 11
- **Pass percentage:** 100%
- **Was the recommendation understandable?** Yes
- **Was the recommendation trustworthy?** Partly — see F-1
- **Actual-result summary:** The Co-Pilot rated the scenario High-risk and "Use with conditions",
  kept the decision with a person, cited named standards for each risk signal, and gave concrete
  safer-way steps. The layout works at phone size and there were no errors. See F-1 and O-2.
- **Bug ticket link(s), if any:** F-1 — [Bug — Co-Pilot says "checked against your active policy" but doesn't check the rules](https://app.notion.com/p/421975c3b9508186b7fcccc3fbdc19cd) (Notion Kanban)

---

## Findings

- **F-1 — Co-Pilot claims a policy check it does not yet perform (medium; responsible-AI disclosure
  accuracy).** The result footer says "Checked against your organization's active policy", but for a
  proposal to rank housing applicants it does not mention the active policy's always-on rule "We
  won't use AI to score, rank, or judge people (for example, who deserves help)." The code records
  the active policy for provenance only; the per-rule check is planned for Epic 5
  ([`studio/lib/domain/copilot-pipeline.ts`](../studio/lib/domain/copilot-pipeline.ts), lines 49–50).
  Fix options: soften the footer wording now, or build the per-rule check.
- **O-2 — Safer-way projection wording (UX, low).** "If you apply these, this would become
  High-risk" repeats the current tier. This is by design (the high-stakes housing setting cannot be
  mitigated away — `neutralizes: false` in
  [`studio/lib/domain/copilot.ts`](../studio/lib/domain/copilot.ts)), but it reads as no improvement.
  Suggested wording: "would still be High-risk, with a person deciding."
- **O-3 — Minor UX notes.** The seed step total changes mid-flow (7 → 6); at phone size the full
  menu is only under the avatar; a new org reaches Home only by skipping setup step 3.

---

## Failure handling
For every failed row:
1. Preserve what actually happened; do not rewrite the result to pass.
2. Record the exact reproduction steps, expected result, actual result, environment, severity, and
   any non-sensitive screenshot.
3. Create a reproducible bug ticket and add its link to the applicable execution record.
4. Retest after a fix and record the new run separately rather than erasing the original failure.
