/**
 * Copy for the landing-page FAQ (card "Add an FAQ section to the landing page", Epic #8). Pure data,
 * so `faq-content.test.ts` can guard it.
 *
 * Every answer maps to something the product does today (draft approved by Val, 2026-11-23):
 * - training / who can see → the audited "How we handle your data" page (`app/your-data`)
 * - AI gets it wrong → self-critique (ADR-0015), rule-check (ADR-0014), human-approval gate
 *   (ADR-0020/0028), provenance labels, reviewer edits (ADR-0022)
 * - decisions about people → Co-Pilot `judgesPerson` → `humanDecisionRequired` (lib/domain/copilot.ts)
 * - free vs paid → ADR-0023 + `CAPABILITY_MATRIX` (lib/domain/entitlements.ts); no billing exists
 * - legal advice → the seeded standards (ADR-0008); the landing "Not legal advice" promise
 * The free cap number is deliberately NOT published: ADR-0023 calls it a tune-later placeholder.
 */

export type FaqItem = {
  question: string;
  answer: string;
  /** Optional link to the data page, shown after the answer. */
  link?: { label: string; href: string };
};

const DATA_PAGE = { label: 'How we handle your data', href: '/your-data' } as const;

export const FAQ = {
  heading: 'Questions nonprofits ask us',
  items: [
    {
      question: 'Is our data used to train AI?',
      answer:
        "By default, no. The AI provider we use, Anthropic, doesn't use what businesses send through its service to train its AI. Before anything reaches the AI, the Studio also removes email addresses, phone numbers, Social Security numbers and card numbers.",
      link: DATA_PAGE,
    },
    {
      question: 'What if the AI gets something wrong?',
      answer:
        "Every draft is checked twice before you see it: the AI reviews its own draft against your rules, and then fixed safety checks run that the AI can't switch off. Anything flagged waits for a person to approve or reject it, and every result is labelled as AI-assisted. A person can edit the draft, and the record shows a person was involved.",
    },
    {
      question: 'Can the AI make decisions about people?',
      answer:
        'No. When the Co-Pilot sees that a use of AI would judge a person — like screening an applicant — it says a named person must make that decision. The Studio is built so AI assists and people decide.',
    },
    {
      question: 'Do we need technical staff?',
      answer:
        "No. You set your organization's AI rules by answering a few plain questions, or by choosing the recommended answers — about five minutes. The Studio guides you from there.",
    },
    {
      question: "What's free, and what will cost money?",
      answer:
        "The whole safety net is free, always: removing personal details, checking every draft, human review, labelling, and your activity record. Free includes a generous monthly number of AI requests. There's no paid plan yet; if one is added, it will only add capacity — more requests, more staff seats or more Skills — never safety.",
    },
    {
      question: "Who can see our organization's information?",
      answer:
        "Everyone in your organization can see its requests, drafts and decisions; other organizations can't. The person who runs the Studio can see the database, to keep it working and to delete data when you ask.",
      link: DATA_PAGE,
    },
    {
      question: 'Is this legal advice?',
      answer:
        "No. Your AI rules are grounded in recognized frameworks — the NIST AI Risk Management Framework, the EU AI Act and ISO/IEC 42001 — but the Studio doesn't give legal advice or make you compliant with any law.",
    },
  ] satisfies FaqItem[],
} as const;
