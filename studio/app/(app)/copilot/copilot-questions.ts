import type { SignalKey } from '@/lib/domain/copilot';

/**
 * The Co-Pilot's five risk questions, as the Leader sees them (Presentation copy, ADR-0003).
 * One question per risk signal in `SIGNAL_DEFS` (lib/domain/copilot.ts), which stays the single
 * source of truth for what each signal MEANS and how it scores; this file only words the question.
 *
 * `hint` — card "Explain each Co-Pilot question in plain words": a one-line plain-language
 * explanation or example shown under each checkbox, so a non-expert can answer correctly (e.g. not
 * knowing what "social scoring" means). Explanatory only — it never changes how a use is scored.
 */
export type CopilotQuestion = { key: SignalKey; label: string; hint: string };

export const COPILOT_QUESTIONS: CopilotQuestion[] = [
  {
    key: 'judgesPerson',
    label: 'Would AI judge, rank, score, or decide about a specific person?',
    hint: 'For example: screening applicants, ranking volunteers, or deciding who gets a service or support.',
  },
  {
    key: 'highStakesDomain',
    label:
      'Is this a high-stakes area — health, legal, financial, housing/benefits, safety, or crisis?',
    hint: "Areas where a mistake could seriously affect someone's health, money, home, legal situation, or safety.",
  },
  {
    key: 'sensitiveData',
    label:
      'Does this involve sensitive personal data (health, financial, case details, or info about vulnerable people)?',
    hint: "For example: a client's diagnosis, income, immigration status, case notes, or anything about a child.",
  },
  {
    key: 'bannedPurpose',
    label: 'Is the purpose manipulation, surveillance, social scoring, or anything illegal?',
    hint: "Social scoring means rating people's worth or trustworthiness from their behaviour. Surveillance means tracking or monitoring people without their knowledge.",
  },
  {
    key: 'outputLeavesOrg',
    label:
      'Will the output be sent outside your organization (to a client, funder, or the public)?',
    hint: "For example: an email to a client, a grant report, or a social media post. Drafts only your team sees don't count.",
  },
];

/** The confirmation a Leader ticks when no question applies (shown only when none is ticked). */
export const NONE_APPLY_LABEL = "I've read each question — none of these apply to this use.";

/** Shown (and announced) when the form is submitted with nothing ticked and no confirmation. */
export const NONE_APPLY_ERROR =
  'Please tick any question that applies, or confirm that none of them apply.';
