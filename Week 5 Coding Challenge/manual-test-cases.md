# Week 5 — Manual Test Case Scenarios (Governed AI Ladder)

> Two manual test cases for the checks a script can't make: UX flow, judgment, and trust.
> Run on the live app: https://ai-development-residency-nine.vercel.app
>
> **Source of truth:** the Notion page *Week 5 Manual Test Case Scenarios — Governed AI Ladder* and
> the two Kanban cards *W5 — Run manual QA: policy seed and activation* and
> *W5 — Run manual QA: Co-Pilot consequential-use flow*. This file mirrors them.
>
> **Status:** Both test cases were run by Valeriya in person: **Test Case 1** on 2026-11-25
> (**Pass 11/11**, about 4 minutes) and **Test Case 2** on 2026-11-26 on a physical iPhone
> (**Pass 11/11**, about 5 minutes); times are the tester's estimates. Both scenarios were also run
> earlier by an AI agent (Claude, in the Claude desktop built-in browser, 2026-11-22), and both
> passed 11/11; those results were replaced by these personal runs and remain in git history.
> Findings for each case are under [Findings](#findings).
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

> **Execution status:** Run personally by Valeriya on 2026-11-25 on the live application, using a
> new test account she created. Claude recorded her spoken observations. Only fictional information
> was used. An earlier run by Claude (2026-11-22) was replaced by this one; it remains in git history.

| Step | What did you do / input? | What should happen? | What actually happened? | Pass or Fail? | Notes / evidence |
|---|---|---|---|---|---|
| 1 | Record environment and start timer | Test context and start time are captured | MacBook Pro M5, 14-inch, Chrome, full-size window. Timer first started 23:12, then restarted at 23:16 for the manual run | Pass | Chrome version not recorded |
| 2–3 | Open production and sign in | App loads and valid Accountable Leader reaches the dashboard | Signed up and signed in; the app loaded and showed a 3-step setup checklist: your organization, set your AI rules, run your first Skill. "Your AI Governance" menu visible at the top | Pass | Everything looked good |
| 4–5 | Start policy seed and inspect orientation/progress | Seed is easy to find and the sequence is understandable | Clicked "Set your AI rules" from the checklist. The screen offers "Use recommended answers" or a step-by-step flow with a step counter and progress bar. All questions are multiple choice and easy to follow | Pass | — |
| 6 | Enter fictional required answers | Valid answers are accepted | Q1 name and role entered; Q2 picked all 5 uses, left "Something else" blank; Q3 sensitive information = Yes; Q4 higher-stakes = Yes. All accepted | Pass | First attempt: "Use recommended answers" pre-filled everything, including role and uses (drafting emails, letters, or communications; summarizing documents; administrative help). It worked; the tester pressed Start over to answer by hand, timed from 23:16 |
| 7 | Skip or mark one optional answer "Not sure" | The flow permits the optional uncertainty without blocking | Optional Q5 (AI content shared outside the org) shows Yes / No / Not sure. First answered Yes, then went back and changed it to Not sure; the flow continued. Q6 reviewer: Val. Q7: read the three built-in limits; nothing added (no "Added by your team" rules in the policy) | Pass | Tester UX note on Q7: "Are there things you want to rule out completely?" is a hard question; people think of what they want AI to do, not what it shouldn't. Suggest a pick-list or presets. The three listed limits are already built in, but that isn't obvious from the screen |
| 8–9 | Submit and wait for generation | A draft policy generates without an unexpected error | Pressed "Generate my policy"; the draft appeared in about a second. No errors | Pass | — |
| 10 | Review draft status, rules, and skipped-answer cue | Draft remains unactivated; rules are plain-language; safe default or review cue is visible | Draft shown, not active. Header says "1 flagged for your review"; one rule has an orange **Needs review** tag, matching the "Not sure" answer on Q5. The other rules carry grey "Safety floor — always on" tags | Pass | Tester note: the Needs review tags aren't clickable, and it's hard to tell what they mean or what they're based on |
| 11 | Inspect grounding and human-review cues | Sources or standards and the user's review responsibility are understandable | Every rule has a "Based on …" line naming its standard (EU AI Act, NIST AI RMF) | Pass | Tester observation: at first the "Based on" line seemed missing. It sits below the more prominent tags and is easy to overlook |
| 12 | Activate the draft | Activation requires a deliberate user action and succeeds | Clicked "Activate this policy" deliberately. The page then showed the same rules with a "Your rules" section below. Each rule is listed separately and every rule, including the first, can be retired; rules also appear to be editable (tester not fully sure). The first rule holds more detail: the accountable person's role and the AI uses. Options at the bottom: Publish changes, Add a rule, Download policy, Download backup, Import from file | Pass | Nothing was active before the click. The tester did not notice a confirmation message and was unsure whether "Publish changes" was still needed to finish |
| 13–14 | Return to and refresh dashboard | Dashboard shows the active policy and the state persists | Going home first shows the setup checklist: step 2 "Set your AI rules" marked done; step 3 "Run your first Skill" still open. Chose "Skip for now — go to Home". Home shows "Policy active", a "Run a Skill" button at the top, and a "Your AI Governance" section with 5 items, each a verb, what it means, and a link: Decide (Ask the Co-Pilot), Set the rules, Review, Monitor, Prove. It also says nothing is waiting for review. Refreshed once: "Policy active" still shown | Pass | A new org reaches Home only by skipping setup step 3. On the checklist screen it isn't obvious the policy is active, only that the step is done |
| 15 | Stop timer and assess usability | Flow remains usable; observations and elapsed time are recorded | Manual run 23:16–23:20, about 4 minutes (the tester's own start and end times; approximate). No errors or broken layout | Pass | Within the ~5-minute target. UX notes are under [Findings](#findings) |

### Execution record
- **Test date/time:** 2026-11-25, 23:16–23:20 (approximate)
- **Tester:** Valeriya Metla, in person (Claude recorded her spoken observations)
- **Production URL:** https://ai-development-residency-nine.vercel.app
- **Deployment/commit:** not checked during the run (head of `main` at the time: `0a18676`; not
  confirmed against Vercel)
- **Browser and version:** Chrome (version not recorded)
- **Device, operating system, and viewport:** MacBook Pro M5, 14-inch, macOS, full-size window
- **Elapsed time:** about 4 minutes
- **Overall result — Pass or Fail:** Pass
- **Passed steps / total steps:** 11 / 11
- **Pass percentage:** 100%
- **Actual-result summary:** Both paths worked: the "Use recommended answers" shortcut and the manual
  answers. "Not sure" on optional Q5 produced exactly one labelled "Needs review" rule. Every rule
  names its standard. Activation needed a deliberate click, and "Policy active" stayed after
  refresh. The UX issues found are about clarity, not function (see Findings UX-1 to UX-5).
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

> **Execution status:** Run personally by Valeriya on 2026-11-26 on the live application on a
> physical phone, using the account from Test Case 1. Claude recorded her spoken observations. Only
> the fixed fictional prompt was used (plus one earlier attempt with her own short description,
> noted below). An earlier run by Claude (2026-11-22) was replaced by this one; it remains in git
> history.

| Step | What did you do / input? | What should happen? | What actually happened? | Pass or Fail? | Notes / evidence |
|---|---|---|---|---|---|
| 1–2 | Record environment, set phone viewport, open production, and sign in | Live app loads and remains usable at phone size | Physical phone: iPhone Air, Chrome. Started 00:33. Signed in; the landing page loads, all boxes fit, and everything looks good | Pass | Physical phone, not an emulated window |
| 3–4 | Open Co-Pilot and inspect the prompt UI | Prompt and controls are readable, reachable, and not clipped | Found via Home → "Your AI Governance" (shows "Policy active") → step 1 "Decide" → Ask the Co-Pilot. The screen explains its purpose well; it has a description box, quick risk questions, and "Get advice". Everything fits on screen with no sideways scrolling | Pass | — |
| 5–7 | Enter the fixed fictional prompt, submit once, and wait | Input is accepted; processing feedback is clear; no duplicate request is needed | Pasted the fixed prompt exactly. Ticked all six risk questions, including the banned-purpose one (ranking applicants treated as scoring). Pressed Get advice once; the button changed to "Checking…" and greyed out, and the answer appeared after about 3–4 seconds | Pass | First attempt (own description, roughly "finding housing and qualifying clients automatically"; all six ticked) gave the same result. Tester UX note: no way to reset or start over after getting advice |
| 8 | Review tier and recommendation | Result avoids unsafe unconditional approval and uses a clear recommendation | "Don't use AI for this", "Prohibited (EU AI Act framework)" | Pass | Differs from the 2026-11-22 run ("Use with conditions / High-risk"), which did not tick the banned-purpose question (see CP-1) |
| 9 | Review reasons | Reasons are plain-language and relevant to the risk signals in the prompt | The reasons explain that ranking applicants and deciding who gets housing means a machine would be making a high-stakes judgment. The reasons make sense | Pass | — |
| 10 | Check human authority | Result keeps the person-impacting decision with a human | "A person must decide" | Pass | — |
| 11 | Inspect citations/grounding | Visible standards or sources support the recommendation | "Why — and the standards behind it" lists the standards and sources behind each reason, and mentions the organization's own rules | Pass | F-1 re-check: the footer still says "Checked against your organization's active policy" (see Findings) |
| 12–13 | Review safer-way or no-safe-path guidance | Guidance is concrete, consistent with the recommendation, and removes unsafe automated decision-making | "There's no safe way to do this", followed by why, and the standards behind it | Pass | No-safe-path branch: the result recommends against the automated decision outright |
| 14 | Inspect the full mobile result | Text and controls wrap correctly with no overlap or horizontal scrolling | Scrolled through the whole result: nothing overlapping or cut off, everything readable | Pass | — |
| 15 | Navigate back and return | Navigation works and the app remains usable | Went to Home, then back to the Co-Pilot; it works smoothly and the Co-Pilot is empty and ready to go | Pass | The previous result is not kept (expected) |
| 16 | Assess comprehension and trust | Tester records whether the result was understandable and trustworthy | Understandable: more or less — hard to read and not interactive. Trustworthy: more or less, for the same reason | Pass | The tester suggests color codes, showing the actual standard names more clearly (now grey and low on the page), and a more interactive, dashboard-like result |

### Execution record
- **Test date/time:** 2026-11-26, started 00:33; end not recorded
- **Tester:** Valeriya Metla, in person (Claude recorded her spoken observations)
- **Production URL:** https://ai-development-residency-nine.vercel.app
- **Deployment/commit:** not checked during the run (head of `main` at the time: `0a18676`; not
  confirmed against Vercel)
- **Browser and version:** Chrome (version not recorded)
- **Device, operating system, and viewport:** iPhone Air (physical phone), iOS
- **Elapsed time:** about 5 minutes, including reviewing the result (tester estimate; the run
  included voice note-taking)
- **Overall result — Pass or Fail:** Pass
- **Passed steps / total steps:** 11 / 11
- **Pass percentage:** 100%
- **Was the recommendation understandable?** More or less — hard to read, not interactive
- **Was the recommendation trustworthy?** More or less
- **Actual-result summary:** With the fixed prompt and all six risk questions ticked, the Co-Pilot
  said "Don't use AI for this" (Prohibited, EU AI Act framework), "A person must decide", and
  "There's no safe way to do this", with reasons and standards. The layout works on a physical
  phone, and navigation is smooth. The issues found are about readability and trust presentation,
  not safety (see Findings CP-1 to CP-4).
- **Bug ticket link(s), if any:** F-1 — [Bug — Co-Pilot says "checked against your active policy" but doesn't check the rules](https://app.notion.com/p/421975c3b9508186b7fcccc3fbdc19cd) (Notion Kanban; re-checked 2026-11-26)

---

## Findings

### Test Case 1 — run by Valeriya, 2026-11-25
- **UX-1 — Q7 is a hard question.** People think of what they want AI to do, not what it shouldn't.
  Suggest a pick-list or presets. The three listed limits are already built in, but the screen
  doesn't make that obvious.
- **UX-2 — "Needs review" tags are unclear.** They aren't clickable, and it's hard to tell what they
  mean or what they're based on.
- **UX-3 — The "Based on …" source line is easy to overlook** next to the tags.
- **UX-4 — No clear "done" after activating.** The tester didn't notice a confirmation and was unsure
  whether "Publish changes" was still needed.
- **UX-5 — The setup checklist hides the result.** It shows step 2 "done" but not "Policy active",
  and a new org reaches Home only by skipping step 3.

### Test Case 2 — run by Valeriya, 2026-11-26
- **CP-1 — The verdict depends on the user ticking the banned-purpose box.** The same fixed prompt
  got "Use with conditions / High-risk" on 2026-11-22, without that box, and "Don't use /
  Prohibited" in this run, with it. Both outcomes keep AI away from the decision, but the stronger
  verdict relies on the user recognising that ranking applicants is scoring.
- **CP-2 — No reset or start over** after getting advice.
- **CP-3 — The footer reads like marketing and hides the key claim.** "AI-assisted governance
  advice — a person decides" comes first, and "Checked against your organization's active policy"
  is at the very bottom. The tester suggests dropping the first sentence and moving the policy check
  further up, where it can be seen. To discuss.
- **CP-4 — The standards are hard to read.** They sit in grey low on the page, and their names
  aren't prominent. The tester suggests color codes, clearer standard names, and a more interactive,
  dashboard-like result. This made the result only "more or less" understandable and trustworthy.
- **F-1 — re-check of the existing bug (Co-Pilot claims a policy check).** The footer still says
  "Checked against your organization's active policy". In this run the result also mentioned the
  organization's own rules, which the 2026-11-22 run did not; this suggests a partial fix from the
  recent no-scoring work, not yet confirmed in code. Bug card:
  [Bug — Co-Pilot says "checked against your active policy" but doesn't check the rules](https://app.notion.com/p/421975c3b9508186b7fcccc3fbdc19cd).

---

## Failure handling
For every failed row:
1. Preserve what actually happened; do not rewrite the result to pass.
2. Record the exact reproduction steps, expected result, actual result, environment, severity, and
   any non-sensitive screenshot.
3. Create a reproducible bug ticket and add its link to the applicable execution record.
4. Retest after a fix and record the new run separately rather than erasing the original failure.
