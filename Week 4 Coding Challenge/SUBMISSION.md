# AI Dev Residency Submission — Week 4 (Build and Launch)

**Community AI Workflow Studio** — Release 1a. Saved in my repository as `Week 4 Coding Challenge/SUBMISSION.md`.

## Links

1. **My GitHub repository:**
   https://github.com/ValeriyaMetla/AI-Development-Residency
2. **My live app on Vercel:**
   https://ai-development-residency-nine.vercel.app/
3. **My database diagram:**
   [docs/reference/database-erd.md](https://github.com/ValeriyaMetla/AI-Development-Residency/blob/main/docs/reference/database-erd.md)
4. **My ADR folder:**
   [docs/adr](https://github.com/ValeriyaMetla/AI-Development-Residency/tree/main/docs/adr)

## Documents

**My Notion links:**

- [Week 4 Coding Challenge — Build and Launch](https://app.notion.com/p/418975c3b95080f0aaeff36652573833)
- [Build and Launch Checklist](https://app.notion.com/p/418975c3b950803e94e2d0ba4961b9f3)
- [Architecture Decision Record homework](https://app.notion.com/p/418975c3b95080299067c8631db41696)
- [Database Design homework](https://app.notion.com/p/418975c3b95080ddaf2deb8756ce17a1)
- [Keep Your App Safe checklist](https://app.notion.com/p/418975c3b95080b2a44ae383d7b80c79)
- [Product Kanban board](https://app.notion.com/p/3f9975c3b95080a88e79c1b79dbff0b6)

**Other document links:**

- [Studio README](https://github.com/ValeriyaMetla/AI-Development-Residency/blob/main/studio/README.md)
- [Release 1a — What We Built and What We Decided](https://github.com/ValeriyaMetla/AI-Development-Residency/blob/main/docs/RELEASE-1A.md)
- [Technical Architecture](https://github.com/ValeriyaMetla/AI-Development-Residency/blob/main/docs/reference/architecture.md)
- [Database Design](https://github.com/ValeriyaMetla/AI-Development-Residency/blob/main/docs/database-design.md)
- [Supabase Migration Files](https://github.com/ValeriyaMetla/AI-Development-Residency/tree/main/studio/supabase/migrations)
- [ADR Index](https://github.com/ValeriyaMetla/AI-Development-Residency/blob/main/docs/adr/README.md)
- [Build Rulebook](https://github.com/ValeriyaMetla/AI-Development-Residency/blob/main/docs/BUILD-RULEBOOK.md)

## What I Did

I had to revise my scope to produce MVP version 1a - a lean functional and shippable product that doesn't yet have all the features built in fully and no UX/UI work. It was built from the perspective of the Accountable Leader user and its journey. I have worked closely with Claude where he was a head developer, and I managed product scope, reviewed all the decisions, tested, and oversaw the organisation of all documentation.

The work for hosting and architecture for the website is inside studio/ directory in my repo. I used:

- **Next.js** to build the website and its server, where the screens live, it provides application framework
  - `studio/app/`
- **TypeScript** to check the code for mistakes across pages, server actions, domain rules, and when integrating data.
- **Material UI** to provide visual components for the interface and design system
  - Design settings: `studio/app/theme.ts`
  - Connecting to the website: `studio/app/layout.tsx`
- **Vercel** to host the website and runs its Next.js server code from GitHub's commands
  - `studio/`
- **Supabase** to store data, manages accounts, and protects the records. I have designed the authentication table and 13 other tables to store data for profiles, skills, task runs, outputs, policy rules, co-pilot assessments, and others.
  - `docs/database-design.md`
  - `docs/reference/database-erd.md`
  - `studio/lib/data/supabase/server.ts`
  - `studio/lib/data/supabase/client.ts`
- **Claude API** to provide drafts and explanations as part of the product design
  - for now it only drafts thank you note and also used to create co-pilot assessment. It's still very simple and doesn't have all the functionality.
  - `studio/lib/data/claude.ts`

I recorded all important decisions in docs/adr, totalling 14 ADRs. Overall, I have focused on these features of the product and built the following user-facing functionality:

- **Sign up/registration** - I tested it with 2 test accounts and confirmed that the data is private and it didn't leak from one account to the other.
- **Policy Seed** - after a person signs up, it can create starter AI policy based on the short intake. I designed it in a plain language grounded in EU AI Act and ISO 42001, and NIST AI RMF. The person can then review and activate the policy. When the policy becomes active it becomes a part of the context of task runs and governs the work.
- **Governance Co-Pilot** that suggest ethical AI use and explains the answer based on the standards and stores the results in the copilot_assessment connecting it to task runs and active policy. The idea is to create a co-pilot to help users navigate the policy setup, for now it's deterministic based on the predetermined standards.
- **Skill Slice to Draft Thank-You Note** - after a person signs up, it can create a task run for thank you note. It can be done with active AI starter policy or before it's set up. This feature will be developed more fully during Release 1b.

In addition, I did a lot of work on behind-the-scene architecture (database design and set up, security checks on Github) and documentation `studio/README.md; docs/RELEASE-1A.md; docs/reference/architecture.md`

I will continue working on developing the product focusing on [MVP Release 1b](https://github.com/ValeriyaMetla/AI-Development-Residency/blob/main/docs/handovers/release-1b-workplan.md).

## What I Learned

I learned so much these 2 weeks. I wasn't able to study with the peers or participate much due to my travels, but I was able to do focused independent work and get the first release 1a. of the MVP done and shipped, which feels like a big deal. I had to go back to product specifications and cut my MVP, splitting it into Release 1.a. and 1.b. to meet the timeline of the residency. This taught me to always choose lean option first when planning, and not trying to do everything, to follow agile mindset, not drift into waterfall. The homework advanced assignment also reminded me to test first release earlier, which I am planning to do shortly, and continue building 2nd release.

I have learned how to create a 3-tier architecture that works and how to orchestrate the production pipeline. I felt I was in the role of technical product manager this week. I have asked a lot of questions to Claude and made sense of all the tiers, like how Supabase sets boundaries for the data use and structure of the data and its management, or how the Vercel server is more of an enforcer for the rules that were created and communicated to it. While completing the homework, I also learned that migration files for Supabase are where all the code is recorded, and can be reviewed, and reproduced.

I learned how to write ADRs, which took trial and error, but I have improved by the end of the assignment. In the future, I would write fewer ADRs - only the most important decisions - and make sure I agree on the structure of it and use one template from the beginning. I also spend time developing and updating documentation, and learned that updating architecture documents, release notes, and database diagrams should be part of each feature's definition of done because this time it wasn't included, and I ended up updating everything at the end of the release.

This week's work will help me to be a better teammate because now I understand the technical pipeline much better, and am well-versed in terminology of deliverables (e.g., product requirements, ADRs, migration files, release notes, architecture and design docs). I can work better with developers and cross-functionally. At the same time, I also learned how to work with AI as an implementation partner which will help me in the future to use it as a collaborator while still being responsible for product decisions, testing, security verifications, and final acceptance of the work.
