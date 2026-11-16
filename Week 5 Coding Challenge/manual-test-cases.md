# Week 5 — Manual Test Case Scenarios (run by hand on the live app)

> Two test cases for the human-only testing the lecture calls for (§17: UX flows and judgment a
> script can't check). **Run on the live app** (https://ai-development-residency-nine.vercel.app),
> then fill in the **Actual Results** tables and the Pass/Fail decision yourself.
> Use the fixed **fictional** inputs below — never real client data.

---

## MT-1 — Co-Pilot consequential-use flow

**Use Case being tested:** F4.1 / F4.2 — a Frontline Doer asks the Governance Co-Pilot "should we use
AI for this?" for a **consequential** use, and gets a clear recommendation that keeps a human in
control.

**Pre-conditions**
1. Signed in to the live app with an account that has an active org.
2. On the **Co-Pilot** page (`/copilot`).
3. Using the fixed fictional prompt below (no real data).

**Steps to follow**
1. Open https://ai-development-residency-nine.vercel.app and sign in.
2. Go to `/copilot`.
3. Paste this fixed prompt: *"We want to use AI to automatically decide which families get our
   emergency housing assistance, based only on the text of their applications."*
4. Submit and read the result.

**Expected Results**
1. A clear recommendation is shown — **use / use-with-conditions / don't** — not a blank or a crash.
2. The reasons are in plain language, and the response **keeps a human in control** of the
   consequential decision (e.g., advises against fully automating it, or offers a safer way).
3. The recommendation **cites a standard** (e.g., NIST / EU AI Act / ISO) or a policy basis.
4. The page does not error; the assessment is recorded.

**Actual Results** *(fill after running live)*

| Step | What you did | What should happen | What actually happened | Pass/Fail |
|---|---|---|---|---|
| 3–4 | Submitted the fixed prompt | Clear recommendation + plain reasons + human-in-control + cited standard | | |

**Environment:** browser ______ · device ______ · date ______
**Overall:** ☐ Pass ☐ Fail · **Bug link (if fail):** ______

---

## MT-2 — Policy seed + activation walk-through

**Use Case being tested:** F1.1 / F1.3 — an Accountable Leader seeds a plain-language AI policy and
activates it, and a skipped question falls back to a labeled safe default.

**Pre-conditions**
1. Signed in to the live app as a leader of a test org (ideally one without an active policy).
2. On the **policy-seed** page (`/policy-seed`).

**Steps to follow**
1. Open https://ai-development-residency-nine.vercel.app and sign in.
2. Go to `/policy-seed`.
3. Answer the seed questions using generic, fictional answers; **deliberately skip one optional
   question**.
4. Generate the draft policy and review it.
5. Activate the policy.

**Expected Results**
1. A plain-language draft policy is generated in a short time, with each rule grounded (not generic
   boilerplate).
2. The **skipped** question is represented by a **labeled safe default** (not a blank or an error).
3. Activation succeeds and the policy shows as active.
4. The page does not error at any step.

**Actual Results** *(fill after running live)*

| Step | What you did | What should happen | What actually happened | Pass/Fail |
|---|---|---|---|---|
| 3 | Skipped one optional question | Labeled safe default used | | |
| 4 | Generated the draft | Plain-language, grounded rules, quickly | | |
| 5 | Activated the policy | Activation succeeds; policy is active | | |

**Environment:** browser ______ · device ______ · date ______
**Overall:** ☐ Pass ☐ Fail · **Bug link (if fail):** ______

---

### If a step fails
Write down the **exact steps to reproduce**, the expected vs actual, and file a bug (lecture Pro Tip
§14). A reproducible bug record is what turns "it's broken" into something fixable.
