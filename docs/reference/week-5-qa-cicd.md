# Week 5 Lecture Reference — Quality Assurance & CI/CD

> **What this is.** A faithful capture of the Week 5 residency lecture on **Quality Assurance
> (QA) and CI/CD**, kept for our own reference while we add the Week 5 pipeline + manual QA to
> the `studio/` app. Diátaxis type: **Reference** (the lecture's facts and method), with a
> clearly separated **"Our notes"** section near the end for how it maps to this repo. It is
> *not* a how-to or a rule set — anything we decide to *adopt* graduates to
> [`BUILD-RULEBOOK.md`](../BUILD-RULEBOOK.md) or an ADR.
>
> **Source.** Captured 2026-11-15 from screenshots of the Week 5 Figma lecture board
> ("Fall 2026 AI Development Residency — Class Lecture and Working Sessions"), provided by Val,
> plus the companion Notion pages (the Week 5 assignment and the "How to Create a CI/CD Pipeline
> on GitHub" guide). Internal reference only.
>
> **Status: complete.** All 17 lecture sections captured 2026-11-15 (one Figma board). §18 is
> our repo cross-walk + Week 5 homework map (our synthesis, not the lecture); §19 is the capture
> log.

---

## 1. If QA Were a Restaurant… (the QA analogy)

Week 5 continues the Week 4 kitchen metaphor. The cast so far, and the new arrivals:

| Role in the kitchen | Who it is in software | What they do |
|---|---|---|
| **The Head Chef** | The Technical Architect | Creates the recipes and designs the whole kitchen structure. *"Technical architecture is written and documented for the software. Patterns, layers, and logic, oh my."* |
| **The Restaurant Manager** | The Product Owner | *"works with the rest of the team to implement the recipes in the kitchen."* |
| **The Line Chefs** | **DEV** + **UI** | The developer **codes**; the UX/UI designer **designs**. They cook the food. |
| **The Food Testers** 🆕 | **QA** | *"THERE ARE SOME NEW LINE CHEFS IN TOWN: THE FOOD TESTERS."* |

**The Food Testers = QA**, and there are **three kinds**:

1. **The QA tester ROBOTS** — automated testers.
2. **The QA tester HUMAN** — a person testing by hand.
3. **The QA tester SCRIPTS** — scripted checks.

> *"Food testers do not cook! They review the food based on the recipe. They taste the food to
> check if it's good enough for the customer. They follow the recipe standards to check."*

The key idea: **QA does not build the software** — it reviews the output **against the recipe
(the requirements)**. This is why requirements quality drives QA quality (see §4).

**What purpose do they serve?**

1. They **check the results against the requirements**.
2. They **check to make sure the code is consistent** for everything that gets produced.
3. **Finding issues** that will prevent the software from working properly.
4. **Finding "drift"** — which is when the software changes unintentionally (see **"Regressions"**).

**The quality gate — "DOES IT PASS QUALITY INSPECTION?"**

- **IF YES** → *"We can ship the food to the customer because it meets the head chef's standards."*
- **IF NO** → *"Send it back to the other line chefs, and re-create the meal. DO NOT send it to
  the customer. It's not ready!"* (Handwritten on the board: *"Send this back! This will make
  someone sick!"*)

> **Our read:** this is the same **"red means stop, green ships"** rule from the CI/CD how-to —
> a failing check sends the work back; only passing work reaches the customer.

---

## 2. Milestones and the Development Lifecycle (where Week 5 sits)

The lecture places QA/CI/CD on the full delivery lifecycle. The milestones, left to right:

**Intake → Discovery → Vision → Scope → Requirements → Implement → Acceptance Testing**

- A **"We are here"** marker sits over the **Requirements Milestone** (carrying into Implement).
- **"Repeat continuously"** loops run across the middle milestones — the lifecycle is
  **iterative**, not waterfall.

Each milestone carries a column of **"Deliverables in Milestone."** The three deliverables
tagged **"Week 5"** show that QA/CI/CD is not one box — it **spans three milestones**:

| Milestone | Week 5 deliverable (green-tagged) |
|---|---|
| **Requirements** | **Use Case Scenarios / BDD Scenarios** |
| **Implement** | **CI / CD** |
| **Acceptance Testing** | **QA Test Scenarios** |

Other deliverables shown in those later milestones (for context):
- **Requirements:** Acceptance Criteria / User Stories · Task Flows · Use Case Scenarios / BDD
  Scenarios · Backlog · Architecture Decision Records · Database Architecture · Software
  Patterns · Security Test Report · Data Engineering.
- **Implement:** Brand Assets · Brand Identity · Editorial Style Guide · Prototypes · Site Map ·
  Interaction Design · Design Annotations · Low/High-Fidelity Prototypes · Copywriting · Design
  System · **Coding** · **Web Hosting** · **CI / CD** · Generative/Evaluative Research.
- **Acceptance Testing:** **QA Test Scenarios** · AI Agent Evals · Evaluative UX Research.

> **Our read:** the chain is **specs → CI → acceptance testing**. The BDD/use-case scenarios
> written at *Requirements* become the automated checks at *Implement* (CI/CD), and the manual
> **QA Test Scenarios** are run at *Acceptance Testing*. That's exactly the Week 5 homework, laid
> across the lifecycle.

---

## 3. How to Perform Enterprise QA (the 7 steps)

A single left-to-right flow of seven steps:

1. **Step 1 — Build your specs:** functional and non-functional requirements.
2. **Step 2 — Write your QA Scenarios** (BDD, Use Cases, Test Cases).
3. **Step 3 — Code.**
4. **Step 4 — Perform CI/CD Checks at the GitHub Repo.**
5. **Step 5 — Perform all other types of QA testing.**
6. **Step 6 — Analyze the QA test results and document.**
7. **Step 7 — Start writing new requirements for code changes.**

> **Our read:** Step 7 loops back to Step 1 — new requirements for code changes restart the
> cycle. Steps 1–2 are already done in our Week 2 specs; Week 5 is mostly **Steps 4–6** (CI/CD
> checks, the other QA testing, and documenting results), with Step 2 revisited to turn existing
> BDD into checks.

---

## 4. QA Glossary (lecture definitions, verbatim)

The board's shared vocabulary. Captured as given so our usage matches the lecture's.

| Term | Definition (as on the board) |
|---|---|
| **Acceptance Criteria** | The plain, clear rules that say when a feature is done and correct. They turn a requirement into something you can mark pass or fail. |
| **Autotest** | Tests that a computer runs for you from a saved script. They are fast, and they run the same way every time. Best for checks you repeat on every build. |
| **BDD** | Short for Behavior Driven Development. It writes each path through a feature in a fixed **Given, When, Then** shape, so everyone reads it the same way. Each line becomes a test you can check. |
| **CI/CD** | Short for Continuous Integration and Continuous Delivery. The app is tested automatically on every change, and it is always kept ready to go live. |
| **DevOps** | A way of working where the people who build the app and the people who run it work as one team, with no wall between them. |
| **Hot Fix** | A release that fixes a serious problem right away, without waiting for the next planned release. |
| **Manual Testing** | A person runs the test by hand and uses their own judgment. It is the best way to catch things a script was never told to look for, like a screen that is confusing or a layout that looks wrong. |
| **New bugs** | A new bug is something that is broken and was never right in the first place. Example: the very first time you tap Save, nothing happens at all. |
| **Quality Assurance** | The work of making sure the app does what it should, and does it well, for every user. It is bigger than just testing. |
| **Regression** | When something that used to work stops working after a change. Regression testing checks that this did not happen. |
| **Smoke Testing** | A quick, light check right after a new build to see if it is stable enough to test more. It does not try every feature. It just checks that the app opens and the most important paths work. |
| **TDD** | Short for Test Driven Development. You write the test first, then just enough code to pass it, then clean it up. People call this red, green, refactor. |
| **Technical Debt** | The extra work you take on later because the code was built in a quick or messy way now. Like a loan, it charges interest over time. |
| **Test Case Scenario** | One exact thing to check, with the setup, the steps, and the result you expect. It is specific enough that anyone can run it and get the same answer. You build it from a BDD scenario. |
| **Test Coverage** | How much of your code or your requirements your tests actually check. Low coverage means big parts of the app are never tested. Teams often set a line it must not drop below. |
| **Unit Testing** | Tests one small piece of code on its own, like one function. These run the fastest and cost the least to write, so you want the most of them. |
| **Use Cases** | One path a person takes through a feature. You write the happy path, where everything goes right, and the non-happy paths, where something goes wrong. |

---

## 5. Who Does QA? (Script, Robot, or Human)

The lecture splits QA work across **three "testers"** (the three Food Testers from §1), each with
a different sweet spot. The rule underneath: **each is best at different work, and the human is
never fully replaceable.**

### Scripts
- **Best for:** running the same checks over and over · automated unit tests · automated
  regression tests · automated smoke tests · automated CI gate checks.
- **Not used for:** exploratory testing · usability / UX / UI testing · browser testing · device
  testing · judging user experience · finding surprises no one wrote down.
- **Why use them:** *"They run fast and the same way every time, and they can run in bulk very
  quickly."*
- **Watch out:** *"A script only checks what someone already wrote down. It cannot find new bugs
  that have never been documented before."*

### Robots
- **Best for:** writing first drafts of test cases · making a lot of test cases at once · running
  test cases you have already made · documenting QA results · pointing out edge cases you missed ·
  checking code for weak spots.
- **Not used for:** manual testing · browser testing · UI testing · device testing.
- **Why use them:** *"They are fast and can cover a lot of ground."*
- **Watch out:** *"They still need a person to check their work. A robot is a helper, not a
  replacement."*

### Humans
- **Best for:** exploring what might be broken · usability testing · integration testing ·
  UX / UI testing · browser testing · device testing · judging user experience and UI styles with
  their eyes · **the final sign-off** · finding surprises no one expected.
- **Not used for:** running the same checks over and over · huge numbers of repeated tests ·
  checks that must run on every push.
- **Why use them:** *"A person notices things that no script was ever told to look for."*
- **Watch out:** *"Humans are slow, and it is easy for a human to miss a step."*

> **Our read:** this maps directly onto the homework. **Scripts** = our CI checks (unit,
> regression, smoke, CI gates) that run on every push. **Robots** = Claude, drafting the tests
> and the skill gate-check (a helper we still review). **Humans** = Val running the two manual
> test cases on the live app and giving the final sign-off — the part a script *cannot* do.

---

## 6. What You Try to Catch (the categories of defects)

The kinds of problems QA is looking for. (Examples are the board's own, from the ADHD-budgeting
teaching app — ours differ, but the categories hold.)

| Category | What it is (board definition) | Example |
|---|---|---|
| **New bugs** | Something broken that was never right in the first place. | The very first time you tap Save, nothing happens at all. |
| **Regressions** | Something that used to work stops working after a change. | You add a new filter, and now the old sort that worked last week is broken. |
| **Drift from architecture decisions** | The code stops following the plan you wrote in your ADRs. | A screen starts talking straight to the database, even though your ADR said never to do that. |
| **Unexpected functionality** | The app does something nobody asked for. | Saving an expense also sends an email that you never planned to send. |
| **Poor user experience flows** | The steps a user takes are confusing or too long. | It takes five taps just to add one expense. |
| **Poor UI styles** | The look of the app is off. | The buttons are out of line, or the text is cut off on a phone. |
| **Performance issues** | The app is slow, or slows down when a lot of people use it. | The list takes ten seconds to load once there are a hundred expenses. |
| **Errors** | The app shows an error message or crashes. | A wrong date makes the whole screen go blank. |
| **Integrations** | A link to another system fails. | The login service says the user is signed in, but the database has no account for them yet. |

> **Our read:** two of these are directly in our world — **"Drift from architecture decisions"**
> is exactly what our `arch-gate.mjs` catches (a component talking straight to the DB against
> ADR-0003), and **Regressions** are what running the test suite on every push guards against.

---

## 7. Martin Fowler's Testing Pyramid (how many of each kind)

> *"A QA test is a check that proves the app does what it should. The testing pyramid is a
> picture that shows how many of each kind of test to write."*

- **Unit tests are at the bottom** because you have the most of them. A unit test checks one tiny
  piece of code by itself (like the part that adds up a total). *"They are fast and cheap, so you
  want the most."*
- **You want fewer integration and end-to-end tests** because they take the most time and energy,
  are more complex to run, and need more checks. *"You do not want to automate many of the
  end-to-end and integration tests because it will slow down every single code push you do in
  your development environment."*

**Types of Test Coverage (the pyramid, top → bottom):**

| Layer of the pyramid | What QA testers check | How many |
|---|---|---|
| **End-to-End tests** (top) | *"the entire sequences from each layer: presentation, domain, service, data source."* | **Way less of these!** |
| **Integration tests** (middle) | *"the connection between one system and another system."* | **More of these!** |
| **Unit tests** (bottom) | *"the functionality that was planned actually works according to ADRs, requirements, and standards."* | **Most of these!** |

> **Our read:** our CI already lives at the wide base — many fast Vitest unit tests + the
> arch-gate, and no slow browser tests clogging every push. Week 5 keeps that shape: add unit/
> integration-level checks for the BDD scenarios, and keep E2E deliberately thin.

---

## 8. Types of QA Testing (the master matrix)

> *"There are many kinds of quality assurance tests that serve different purposes! All of these
> are used in combination with each other on Enterprise Development teams. Robots, humans, and
> scripts work together to provide 'test coverage.'"*

| Type of Test | What Does It Catch? | Human / Robot / Script? | Unit / Integration / E2E? | What Do You Test? | Software Layer | Automated / Manual? | How Do You Perform It? | Write BDD? |
|---|---|---|---|---|---|---|---|---|
| **Feature Testing** | Functionality Bugs · Regressions | Script | Unit | Test the business logic | Domain | Automated | CI/CD Checks | **Yes** |
| **Regression Testing** | Regressions | Script | End-to-End | Test to see if new code changes broke old code | All | Automated | CI/CD Checks | **Yes** |
| **Smoke Testing** | Functionality Bugs · Regressions | Robot | End-to-End | — | All | Manual | QA Test Case Scenarios | No |
| **Security Testing** | Vulnerabilities | Robot | End-to-End | Test for security holes | All | Both | QA Test Case Scenarios · Security testing tools | **Yes** |
| **Performance Testing** | Performance issues | Robot | End-to-End | Test for slow UI, slow servers, slow integrations, or slow databases | All | Both | Performance testing tools | No |
| **Browser Testing** | Performance issues · Functionality Bugs | Human | Unit | Test how your application performs across different internet browsers | Presentation · Service | Both (Mostly Manual) | QA Test Case Scenarios · Browser testing tools | No |
| **Device Testing** | Performance issues · Functionality Bugs | Human | Unit | Test how your application performs across different OS's and devices | Presentation · Service | Manual | QA Test Case Scenarios | No |
| **UI Testing** | Poor UX flows · Poor UI styles | Human | Unit | Test whether your User Interface renders properly | Presentation | Manual | QA Test Case Scenarios | **Yes** |
| **Integration Testing** | Integration issues · Errors | Robot or Human | Integration | Test how well your application integrates with other apps | Service | Both | QA Test Case Scenarios · Log audits analytics | **Yes** |

> **Our read:** this matrix is the decision table for the homework. The **Automated / CI/CD**
> rows (Feature, Regression, Security) are what belongs in our pipeline on every push; the
> **Manual / QA Test Case Scenario** rows (Smoke, UI, Device) are candidates for our two
> hand-run test cases. The **"Write BDD?"** column tells us which scenarios convert cleanly into
> coded checks (Feature, Regression, Security, UI, Integration = Yes).

---

## 9. How Do Requirements Affect the Success of QA?

> *"QA can only check what the requirements spell out. When the requirements are clear, you know
> what to test and what counts as a pass. When they are missing or fuzzy, QA is left guessing. So
> strong requirements are the base that all good QA is built on."*

How each kind of requirement helps QA do its job:

| Requirement artifact | How it helps QA |
|---|---|
| **Acceptance Criterion** | The plain rules that say when a feature is done and correct. They give QA a clear pass/fail line to test against. *"Without them, no one can agree on whether a test passed."* |
| **BDD Scenarios** | Write each path as Given, When, Then. QA turns each one into a test, by hand or as an autotest. They make sure the test checks the exact behavior the team agreed on. |
| **Use Case Scenarios** | List every path a person can take, the happy ones and the ones that go wrong. They show QA all the cases to test, not just the easy path. *"This is how QA catches the edge cases."* |
| **Prototypes** | Show what each screen and flow should look like and do. QA checks the built app against them — easy to spot a screen that looks wrong or works wrong. |
| **Technical Architecture ADRs** | Record the technical decisions and the rules the code must follow. QA uses them to check the app was built the way the team decided. *"They help QA catch drift, when the code stops following the plan."* |
| **Test Case Scenarios** | One exact check, with the setup, the steps, and the result you expect. QA runs it and compares the real result to the expected one. *"A match is a pass, and a mismatch becomes a bug ticket."* |

> **Our read:** we're unusually well-set-up here — our Week 2 specs already carry acceptance
> criteria, a full BDD set, use-case scenarios, and ADRs. The arch-gate operationalizes the
> "ADRs → catch drift" row. Week 5 is largely *turning requirements we already wrote into checks.*

---

## 10. What's the Difference Between Test Cases, BDD, and Use Cases?

A three-circle Venn. The distinct cores:

- **BDD** — *"Describe the conditions and the expected behavior of users / system but do not track
  results."*
- **Test Cases** — *"Provide the step by step sequence to follow to perform a QA test AND track
  the results."*
- **Use Cases** — *"Provide the steps that the system and users take when performing a system
  task."*

The overlaps:

| Overlap | What they share |
|---|---|
| **BDD ∩ Test Cases** | Both describe pre-conditions and expected results. |
| **Use Cases ∩ BDD** | Both describe system behavior and user behavior. |
| **Use Cases ∩ Test Cases** | Both have step-by-step sequences. |
| **All 3** | *"Are used for quality assurance testing."* |

> **Our read:** the key distinction is **"track the results."** Only the **Test Case** records an
> *actual* result and a pass/fail — which is exactly what our two hand-run manual tests must do.
> BDD says the expected behavior; the Test Case is where we write down what *actually* happened.

---

## 11. A Worked Example — Use Case vs. BDD vs. Test Case (same scenario)

The board runs one scenario — **"Admin with an existing account logging in correctly"** — through
all three artifacts, to show how they differ on the same path.

**BDD (Given / When / Then):**
```
GIVEN I am an admin
AND I already have an existing account
WHEN I navigate to the login page
AND enter my email
AND enter my password
AND both are correct
THEN the system will log me in
AND I am asked for a 2 Factor Code
```
*(A second BDD scenario covers the admin with no existing account → THEN an error message + asked
to create an account.)*

**Use Case (the full step sequence, system + user):**
```
1. Go to browser   2. Enter xxxxxxx.com   3. Enter   4. Go to login page
5. Enter an email  6. Enter a password
7. The system checks against the database for an account
8. The system finds the record in the database
9. The browser sets a session
10. The user is redirected to the home page
11. The admin is asked for a 2FA code
```

**Test Case (what QA actually runs and records):**
- **Pre-conditions:** I need an existing account already · the existing account needs admin
  privileges.
- **Steps to Follow:** 1. Go to browser · 2. Enter xxxxxxx.com · 3. Enter · 4. Go to login page ·
  5. Enter an email · 6. Enter a password.
- **Expected Results:** 1. The browser sets a session in cookies · 2. The user is redirected to
  the home page · 3. The admin is asked for a 2FA code.
- **QA Result Table** (columns): **Step · Input Value · Expected Results · Actual Results · Pass
  or Fail?** — e.g. a row where expected = *"Field input is limited to max allowable chars"* and
  actual = *"The app crashed with a 500 server error"* → **Failed.**
- **Pass Percentage:** *"125 test cases in this release have a 98% pass rate. 3 test cases
  failed."*

### When Are These Used? (the punchline)

| Artifact | Used for… |
|---|---|
| **BDD** | ✅ **AUTOTESTS** |
| **Test Case** | ✅ **MANUAL TESTS** |
| **Use Case** | ❌ **NOT USED IN QA** (it's the *source* the other two are built from, not a test itself) |

> **Our read:** this is the single most important board for the homework's structure. It tells us
> exactly which artifact produces which deliverable: **our Week 2 BDD → the automated CI checks**,
> and **Test Case Scenarios (built from those) → the two manual tests Val runs on the live app**,
> recorded in the Test Case template's QA Result/Failure table. Use cases feed both but aren't
> themselves run.

---

## 12. QA Test Case Scenarios, Step by Step (the 6-step method)

The lecture's recipe for producing a test case — the workflow we'll follow for the two manual
tests. (This is the practical form of §11: use case → BDD → test case → run → bug ticket.)

1. **Start with the acceptance criterion.** Pick one feature. Write the plain rule that says when
   it is done and correct. *"Every test starts here."*
2. **List the use cases.** Write the happy path, where everything goes right. Then write the
   non-happy paths, like a blank amount or a logged-out user.
3. **Write each use case as a BDD scenario.** Put each path into the Given, When, Then shape, so
   everyone reads it the same way.
4. **Turn each BDD scenario into a test scenario.** Add the pre-conditions, the exact steps, and
   the expected result, so anyone can run it the same way.
5. **Run it and write down the actual result.** Run the test. Mark it pass or fail. Write down
   what really happened.
6. **File a bug ticket for each failure.** For every fail, write a bug ticket with the steps to
   reproduce, the expected result, and the actual result.

> **Our read:** steps 1–4 are mostly *already done* in our Week 2 specs (acceptance criteria +
> BDD exist). For the manual deliverable we pick two features, confirm their BDD, write them up as
> test cases (step 4), then **run them on the live app and record actuals (step 5)** — the part
> that must be genuinely done by hand.

---

## 13. Anatomy of a Test Case (the six parts)

What every test case contains. This maps 1:1 onto the Notion **Test Case Scenario Template** we'll
fill for the two manual tests.

| Part | What it is |
|---|---|
| **Scenario** | Describe the overarching situation (the use case) that this test case covers. Include the specific audiences that relate to the scenario as well. |
| **Pre-conditions** | The setup for the test. Name what must already be true before you start, like an admin who is logged out and on the login page. |
| **Steps to Follow** | The exact actions to take, in order, so anyone can run the test the same way and get the same result. *"Keep each step to one simple action."* |
| **Expected Results** | What should happen if the app works correctly. The line you check the real result against — *"write it clear enough to mark a plain pass or fail."* |
| **Results Table** | Where you record what really happened for each test and mark it pass or fail. *"A match passes. A mismatch is a fail, and each fail becomes a bug ticket."* |
| **Pass Percentage** | The number of passed scenarios over failed scenarios in a release, to show a high-level success rate. |

The board's **Test Case Example** (same login scenario) is the one already captured verbatim in
§11 — Scenario → Steps to Follow → Expected Results → **QA Result Table** (Step · Input Value ·
Expected Results · Actual Results · Pass or Fail?) → **Pass Percentage** (*"125 test cases in this
release have a 98% pass rate. 3 test cases failed."*).

---

## 14. Pro Tips for QA (manual-testing craft)

Four tips, aimed at the by-hand testing a script can't do:

1. **Test on Different Browsers.** Check the app on Chrome, Safari, Edge, and Firefox, not just
   the one you use. *"Each browser reads the code a little differently, so a page that looks
   perfect on one can break on another. Your users are spread across all of them."*
2. **Test on Different Devices and Systems.** Try it on a phone, a tablet, and a computer, on both
   Apple and Android or Windows. *"A button that works on your laptop may be cut off or dead on a
   phone."*
3. **Try to Break the App on Purpose.** *"Do not just walk the happy path. Enter bad data, tap too
   fast, leave fields blank, and go backward. Real users do strange things, so it is better that
   you find the weak spot before they do."*
4. **Always Document the Steps to Reproduce.** Write the exact steps that led to the bug, every
   time. *"If you cannot show how to make the bug happen again, no one else will see it or
   understand how to fix it. The steps to reproduce are what turn 'it is broken' into something a
   developer can actually solve."*

> **Our read:** tips 1–2 (browsers/devices) line up with the §8 matrix's *Human / Manual* rows —
> good candidates for one of our two manual tests. Tip 3 ("break it on purpose") is also the
> homework's own check: push a change that *should* fail and confirm the pipeline catches it.

---

## 15. What is DevOps? (and the DevOps pipeline on product teams)

> **DevOps stands for Development Operations.** *"It's a way of working where the people who build
> the app and the people who run it work as one team, with no wall between them."*

In the old way, one group wrote the code and handed it off to another to launch and run — and
problems fell into the gap between them. DevOps removes that wall: the same team builds, tests,
launches, and watches the app in the real world, sharing both the credit and the fixes. Teams use
it to *"ship small changes often and safely, instead of saving up one big risky release."* It
matters most for large teams where many people touch the same app.

**DevOps Process on Product Teams** (the lecture credits *Martin Fowler's Practical Test Pyramid*;
the pipeline stages are **Build → Test → Provide Infrastructure → Deploy → Test More**):

| # | Stage | Step | Tester |
|---|---|---|---|
| 1 | BUILD | **Develop the Code** — a developer codes the feature locally (Claude Code, another AI tool, or their own brain). | — |
| 2 | TEST | **Test on Your Own Computer** — the developer runs QA checks locally, the right test for the type of work. | **Manual** |
| 3 | INFRASTRUCTURE | **Push the Code to the GitHub Repo** — a new "Push" to their repo. | — |
| 4 | INFRASTRUCTURE | **Pull Request Created** — GitHub turns it into a PR; new code is ready to be "merged" into Production (live) code. | — |
| 5 | INFRASTRUCTURE | **GitHub Performs Scripted Quality Checks (CI)** — automated scripts check every PR. *"Large development teams can't rely only on humans to ensure that nothing goes to production with bugs."* | **Autotests** |
| 5a | DEPLOY | **If Pass, MERGE the Code to Production (CD).** | Autotests |
| 5b | INFRASTRUCTURE | **If Fail, DO NOT MERGE** — prevent the code reaching production, *"or else there will be catastrophic bugs, failures, or security breaches. Send it back."* | Autotests |
| 6 | TEST AGAIN | **Perform Manual Testing** — *"Human beings and robots need to test the code once it merges into the production environment."* | **Manual + Autotests** |

> **Our read:** this is exactly our flow — develop → local check → push → PR → **GitHub Actions CI
> (pass → Vercel deploys; fail → don't merge)** → then test live. Step 6 is where our two manual
> test cases land: on the live app after merge.

---

## 16. What is CI/CD? (the old way vs. the new way)

> *"CI/CD is how a team gets code from a developer's computer to real users safely and often."*

- **CI — Continuous Integration:** *"every person on the team merges their new code into one
  shared copy often, usually many times a day. Each time code is added, the system automatically
  builds the app and runs the tests."*
- **CD — Continuous Delivery:** *"the app is always kept in a state where it could go live at any
  moment, so releasing stops being a big scary event and becomes a simple choice, often just the
  push of a button."*

The reason teams do this is **speed with safety**: small changes go out all the time, each checked
by automatic tests before it reaches users, and a problem is easy to spot and undo because the
change was small. *"In this class, your CI/CD happens at your GitHub repo, which runs the checks,
and Vercel, which deploys the app."*

**Benefits of CI/CD:** ship one feature at a time, continuously · reduce total bugs over time ·
reduce human error in the release cycle · fix bugs faster.

| | THE OLD WAY ("Release Cycle") | THE NEW WAY ("CI/CD") |
|---|---|---|
| **Integration** | Integrate all features at once, only when ready. A QA team tests every feature going into one giant "release"; if one feature fails, the whole release waits. | **CI:** integrate features into the code base *continuously* (without humans). Scripts run checks on every push; rules set by the technical architect. |
| **Delivery** | Deliver ALL features at once, triggered by a human. Everything must be ready before customers see any of it. | **CD:** deliver features *continuously, one at a time*, to customers (without humans). When a package passes the quality check, it's delivered immediately. Hundreds of changes can go live in a single week. |

> **Our read:** we're already on "the new way" — GitHub Actions is the scripted gate, Vercel is
> continuous delivery on merge. Week 5 deepens the CI side (more checks derived from our BDD +
> the skill gate-check), not the delivery side.

---

## 17. What Should CI Checks Include — and What's NOT Good to Check on CI

The single most decision-relevant pair of boards for our pipeline. The line is drawn by what a
*script* can reliably judge versus what needs human eyes or a real environment.

**✅ What CI checks SHOULD include:**

| Check | Why it belongs in CI |
|---|---|
| **Software Architecture Standards** | CI can fail the build when code is put in the wrong spot or breaks the structure the team agreed on. Keeps the codebase from getting messy as it grows. |
| **Accessibility standards** | Automated tools scan every page for common problems (missing alt text, low color contrast, a button with no label). Run on every push so broken access is caught early. |
| **Regressions** | CI re-runs all your old tests on every push, so it catches them fast. |
| **Unit Tests** | Check each small piece of code on its own, run fast — a broken piece is caught in minutes. |
| **Security Vulnerabilities** | CI scans your own code and the outside libraries you use for known security holes, flagged on every push before a weak spot ever ships. |

**❌ What's NOT good to check on CI (needs a human / real environment):**

| Not for CI | Why not |
|---|---|
| **Poor user experience flows** | A script can tell if a button works, but not if the *path* to it is confusing or frustrating. A real person has to walk through the flow. |
| **Poor UI styles** | Scripts cannot determine how a UI looks or whether it's pixel-perfect. *"Only someone with EYES can do this!"* |
| **Performance issues** | Real speed problems show up with real users, real data, and real devices. CI runs on a small, clean setup, so it misses the slowdowns people actually feel. |
| **Integrations** | CI usually tests against fake stand-ins for outside services (payments, email), not the real ones. End-to-end needs a test against the live service that a person sets up and checks. |

> **Our read:** the "SHOULD" column maps almost exactly onto what we already run —
> **Architecture Standards = `arch-gate.mjs`**, Regressions + Unit = Vitest on every push,
> Security = `npm audit` + gitleaks. The one clear *addition* worth considering is an
> **accessibility check** in CI (we have the `accessibility` skill/standard but no automated gate
> yet). And the "NOT good for CI" column is precisely the menu for our **two manual tests** —
> a UX-flow walk-through and/or a UI-rendering check are the natural picks.

---

## 18. Our notes — how this maps to our repo (Week 5 homework) *(our synthesis, not the lecture)*

The Week 5 homework has **5 required parts** (see the assignment). The crucial fact: our
`studio/` app **already ships CI**, so most of this *extends* what exists rather than building from
scratch.

### Our Part A outcome *(adopted 2026-11-15)*

> *"Every time I push code to the Governed AI Ladder, I want automatic checks to catch bugs and
> regressions before they reach users, and to prove the code still follows our layered
> architecture, our security rules, and our Claude Skills — so our safety guarantees never quietly
> break."*

This is the how-to's **Part A** outcome — the yardstick every Week 5 check is measured against.
Note what it protects: not just bugs, but the **architecture (ADRs), security rules, and the
Skills** — the governance safety net itself.

### A. What we already have (Release 1a)

- **[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)** — `app-checks` job: ESLint ·
  Prettier · `tsc --noEmit` · Vitest · `next build` · `npm audit` (prod, high+) · dep report;
  `secret-scan` job: **gitleaks**.
- **[`.github/workflows/arch-gate.yml`](../../.github/workflows/arch-gate.yml)** — runs
  [`scripts/arch-gate.mjs`](../../scripts/arch-gate.mjs), the deterministic layering check.
- **Trigger today:** PR + push to **`main`** only.
- **[`docs/BUILD-RULEBOOK.md`](../BUILD-RULEBOOK.md)** — Definition of Done + Git workflow gates.

### B. Cross-walk (lecture → our repo)

| Lecture section | Where it lives for us |
|---|---|
| §1 red/green gate · §16 CI/CD | GitHub Actions (checks) + Vercel (deploy on merge) |
| §6 "drift from ADRs" · §17 architecture standards | **`arch-gate.mjs`** (enforces ADR-0003 layering) |
| §7 testing pyramid | wide **Vitest** unit base; E2E deliberately thin |
| §8 matrix — *Automated/CI* rows (Feature, Regression, Security) | ci.yml checks (Vitest, `npm audit`, gitleaks) |
| §8 matrix — *Manual* rows · §17 "not for CI" | our **two manual test cases** |
| §11–§13 test-case method + anatomy | the two manual tests, via the Notion **Test Case Scenario Template** |
| §9 requirements → QA | our Week 2 **User + Technical requirements** (BDD set F1.1–F8.4) |

### C. The Week 5 gaps / new work *(candidates — nothing built or decided yet)*

1. **Run on every push** (part 1). Current triggers are `main`-only; the assignment wants *every
   push*. Small workflow-trigger change.
2. **Skill gate-check** (part 2) — **new.** Nothing validates `.claude/skills/` today; a push that
   breaks a skill must fail. Approach not yet decided.
3. **BDD → checks mapping** (part a/b). Tie our Week 2 BDD scenarios to specific checks; some may
   need new unit/integration tests.
4. **Accessibility CI check** (§17 candidate) — optional add; we have the `accessibility` standard
   but no automated gate.
5. **Two manual test cases** (part 3) — pick from the §17 "not-for-CI" menu (UX flow and/or UI
   render), run on the live Vercel app, record pre-conditions/steps/expected/actual in the
   template.
6. **SUBMISSION.md** (part 5) — **Val writes "What I Did" and "What I Learned" herself, no AI**
   (the assignment checks this). Claude only scaffolds links/structure.
7. **ADR for the Week 5 choices** (§ how-to Part D) — record the big decisions (skill gate design,
   trigger change).
8. **No branch protection** (part 4) — nothing to do; free plan.

### D. "Before You Submit" checklist (from the assignment)

- [ ] CI runs on **every push** (not just `main`)
- [ ] Break something on purpose → pipeline goes **red** and catches it
- [ ] At least **3 new CI checks** on the repo
- [ ] Week 1 **Claude Skills checked on every push**
- [ ] **Both manual test cases** run on the live app + results written down
- [ ] Live app **still works** after the changes
- [ ] `Week 5 Coding Challenge/SUBMISSION.md` filled (reflections by Val)

---

## 19. Capture log

- **Batch 1 (2026-11-15):** full Week 5 Figma lecture board — all 17 sections (If QA Were a
  Restaurant; Milestones & Lifecycle; How to Perform Enterprise QA; QA Glossary; Who Does QA;
  What You Try to Catch; Fowler's Testing Pyramid; Types of QA Testing matrix; How Requirements
  Affect QA; the BDD/Test Case/Use Case Venn; the worked login example + When Are These Used; QA
  Test Case Scenarios Step by Step; Anatomy of a Test Case; Pro Tips for QA; What is DevOps +
  pipeline; What is CI/CD old-vs-new; What CI should vs should-not check). Companion Notion pages
  (assignment, CI/CD how-to, Test Case template, Week 2 User + Technical requirements) read the
  same day. §18 added as our synthesis.
- *Add further batches here if the board is updated.*
