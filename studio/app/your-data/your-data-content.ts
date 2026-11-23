/**
 * Copy for the public "How we handle your data" page (card "Add a plain-language \"How we handle
 * your data\" page", Epic #8). Pure data, no I/O, so `your-data-content.test.ts` can guard it.
 *
 * Every sentence comes from the audited fact sheet on that card (v2, 2026-11-23), traced to code,
 * an ADR, or a provider's own page. Rules for editing:
 * - Only claim what the product enforces today. When the product changes, change this page too.
 * - Keep "what we don't do yet" as plain as the protections.
 * - Third-party facts carry their source link; Val confirmed the wording on 2026-11-23.
 * - This is a plain-language summary, not a privacy policy (decision 2026-11-23).
 */

export type Item = { lead?: string; text: string };
export type SourceLink = { label: string; href: string };
export type Provider = { name: string; text: string; links: SourceLink[] };

export const LAST_UPDATED = '23 November 2026';

/** Shown on this page and the footer; Gmail files it under the "Privacy" label. */
export const PRIVACY_EMAIL = 'communityaistudio+privacy@gmail.com';

export const YOUR_DATA = {
  title: 'How we handle your data',
  label: `Plain-language summary · not legal advice · last updated ${LAST_UPDATED}`,
  intro:
    "Community AI Workflow Studio helps small nonprofits use AI safely. This page explains, in plain words, what happens to your organization's information — including what we don't do yet.",
  earlyVersion: {
    lead: 'This is an early version for testing.',
    text: "Please don't enter real client information or details about the people you serve.",
  },

  ai: {
    heading: 'What goes to the AI',
    intro:
      'When someone on your team asks the Studio to draft something, or asks the Co-Pilot (the Studio\'s "should we use AI for this?" adviser) for advice:',
    items: [
      {
        lead: 'First, we remove',
        text: 'email addresses, phone numbers, US Social Security numbers and card numbers from what they typed. The AI never sees those.',
      },
      {
        lead: 'Then we send',
        text: "the AI: the request with those details removed, and your organization's AI rules, so it follows them. When drafting, the AI also checks its own draft against your rules.",
      },
      {
        text: 'Your activity record notes which kinds of details were removed — never the details themselves.',
      },
      {
        text: 'When drafting, a staff member can choose to keep a detected detail on purpose. That choice is recorded under their name.',
      },
    ] satisfies Item[],
  },

  access: {
    heading: "Who can see your organization's information",
    items: [
      {
        lead: "Other organizations can't.",
        text: "Each organization's information is walled off in the database.",
      },
      {
        lead: 'Everyone in your organization can',
        text: "see your organization's requests, AI drafts, review decisions and notes. Keep that in mind when writing notes.",
      },
      {
        lead: 'The person who runs the Studio can',
        text: 'see all information in the database, to keep it working and to delete data when you ask.',
      },
      {
        text: 'The Studio never uses a master key that bypasses these walls. The database checks what each person is allowed to see and do.',
      },
    ] satisfies Item[],
  },

  kept: {
    heading: 'What we keep',
    items: [
      { text: 'Your account: email address and the name you give.' },
      {
        text: "Your organization's name, its AI rules, and the answers you gave when setting them up.",
      },
      {
        text: "For each request: the first 200 characters (with personal details removed), the AI's draft, any edited version, the safety-check results, and the review decision and any note.",
      },
      { text: 'Co-Pilot questions (with personal details removed) and its advice.' },
      { text: 'Your activity record: what happened, when, and who did it.' },
      { text: 'A simple count of AI requests, used to stop overuse. It holds no content.' },
    ] satisfies Item[],
  },

  record: {
    heading: 'Your activity record',
    text: "No one using the Studio can edit or delete an entry. Each entry's time is set by the system and recorded under the account that took the action. Someone with direct access to the database could still change entries, and the Studio doesn't detect that yet.",
  },

  providers: {
    heading: 'Who we work with',
    intro: "All of your organization's information is stored and processed in the United States.",
    items: [
      {
        name: 'Anthropic',
        text: "provides the AI (Claude). By default, it doesn't use what businesses send through its service to train its AI, and deletes it within 30 days, with some exceptions.",
        links: [
          {
            label: 'Anthropic: training',
            href: 'https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training',
          },
          {
            label: 'Anthropic: how long data is kept',
            href: 'https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data',
          },
        ],
      },
      {
        name: 'Supabase',
        text: "stores the database and handles sign-in, in East US (Ohio). Information is scrambled so it can't be read if intercepted or copied.",
        links: [{ label: 'Supabase security', href: 'https://supabase.com/security' }],
      },
      {
        name: 'Vercel',
        text: 'runs the website, from Washington, D.C. It keeps basic records of each visit for 1 hour. The Studio only records error messages there — never what you typed or what the AI wrote.',
        links: [{ label: 'Vercel logs', href: 'https://vercel.com/docs/logs/runtime' }],
      },
    ] satisfies Provider[],
  },

  notYet: {
    heading: "What we don't do yet",
    intro: "We'd rather tell you plainly:",
    items: [
      {
        lead: 'Names, street addresses and health details',
        text: "aren't detected or removed yet.",
      },
      {
        lead: 'Notes people type',
        text: "— and your AI rules — aren't checked for personal details.",
      },
      {
        lead: "There's no button to delete",
        text: "your account and data yet. Ask us (below) and we'll do it by hand.",
      },
      { text: "Changes made directly in the database aren't detected yet." },
      {
        lead: "There's no formal privacy policy",
        text: 'yet. This page is a plain summary, not a legal document.',
      },
    ] satisfies Item[],
  },

  contact: {
    heading: 'Questions, or deleting your data',
    emailLead: 'Email us at',
    deletion:
      "To delete your organization's data, send your organization's name and the email address on the account. We'll confirm by replying to that account's email before we delete anything, so no one can delete another organization's data by pretending to be them.",
  },
} as const;
