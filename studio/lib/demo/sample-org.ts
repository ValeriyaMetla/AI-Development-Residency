/**
 * Sample organization for the no-login demo (ADR-0029). FIXED DATA, NO I/O.
 *
 * The demo renders only from this file: no database call, no model call, no session. The
 * `demo-is-offline` arch-gate rule fails the build if anything under `lib/demo/` or `app/demo/`
 * reaches the data layer, Supabase or the Claude SDK (type-only imports are allowed).
 *
 * Honesty rules for this file (ADR-0029 points 2–5):
 * - Everything is fictional. People appear by role only, never by name.
 * - Any personal data is obviously fake: `@example.com` addresses and `555` phone numbers.
 * - Each `preparedDraft` was written in advance for the demo; no AI produced it. The personal-data
 *   strip and the rule-check are NOT recorded here: the demo runs the real Domain functions on
 *   these texts (T3), and `test/demo-sample-org.test.ts` checks this file agrees with them.
 * - Policy rules reuse the real standards catalog's wording and citations
 *   (`supabase/migrations/20261113010000_seed_standards.sql`).
 * - Only the product's real Skill ("Draft a thank-you note") appears, so the demo shows no
 *   capability the product doesn't have.
 */
import type { Policy, PolicyRule } from '@/lib/data/policy';
import type { AuditRecord } from '@/lib/domain/report';

export const SAMPLE_ORG = {
  id: 'demo-org',
  name: 'Riverbend Community Pantry',
} as const;

export const SAMPLE_POLICY: Policy = {
  id: 'demo-policy',
  orgId: SAMPLE_ORG.id,
  name: 'Riverbend AI Use Policy (sample)',
  status: 'active',
  createdAt: '2026-11-02T15:00:00.000Z',
};

/** Builds a sample rule from a real standards-catalog entry. */
function standardRule(
  code: string,
  ruleText: string,
  category: string,
  riskTier: string,
  citation: string,
  isBaselineSafety: boolean,
): PolicyRule {
  return {
    id: `demo-rule-${code}`,
    policyId: SAMPLE_POLICY.id,
    ruleText,
    standardRuleId: null,
    citation,
    category,
    riskTier,
    origin: 'standard',
    isBaselineSafety,
    needsReview: false,
    sourceQuestion: null,
    suggestionKey: null,
    createdAt: SAMPLE_POLICY.createdAt,
  };
}

export const SAMPLE_RULES: PolicyRule[] = [
  standardRule(
    'nist-human-oversight',
    'A named person is accountable for each AI use and has the final say: AI assists, people decide.',
    'human-oversight',
    'all',
    'NIST AI RMF (2023), GOVERN function',
    true,
  ),
  standardRule(
    'euaiact-disclose-ai',
    'Tell people when they are dealing with AI, and label AI-generated content.',
    'transparency-provenance',
    'all',
    'EU AI Act (Reg. (EU) 2024/1689), Article 50 (transparency)',
    true,
  ),
  // The rule-check's contact-detail check only runs when a data-protection rule is active.
  standardRule(
    'iso42001-data-governance',
    'Govern the data you put into AI: minimize it, check its quality, and protect sensitive information.',
    'data-protection',
    'sensitive',
    'ISO/IEC 42001:2023, Annex A (data governance controls)',
    false,
  ),
  standardRule(
    'iso42001-managed-logging',
    'Run AI as a managed system: log how it is used and review it regularly.',
    'accountability-logging',
    'all',
    'ISO/IEC 42001:2023 (AI management system)',
    true,
  ),
];

/** The one real Skill the product has (seeded in `20261112030000_seed_hero_skill.sql`). */
export const SAMPLE_SKILL_NAME = 'Draft a thank-you note';

/** A request a visitor can pick. There is no free text anywhere in the demo (ADR-0029 point 4). */
export type SamplePreset = {
  id: 'donor' | 'volunteer' | 'partner';
  /** Short choice label shown in the picker. */
  label: string;
  /** The sample request as a staff member might type it, with obviously fake personal data. */
  request: string;
  /** Written in advance for the demo. No AI produced it (ADR-0029 point 5). */
  preparedDraft: string;
  /** The sample run this preset corresponds to in the audit trail. */
  taskRunId: string;
};

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'donor',
    label: 'Thank a monthly donor',
    request:
      'Write a thank-you note to our monthly donor (donor@example.com) for supporting the ' +
      'winter food boxes.',
    preparedDraft:
      'Thank you for your monthly gift. Because of you, Riverbend packed winter food boxes for ' +
      'families across our neighborhood this season. Your steady support means families can ' +
      'count on us, week after week. With gratitude, the Riverbend Community Pantry team.',
    taskRunId: 'demo-run-donor',
  },
  {
    id: 'volunteer',
    label: 'Thank a Saturday volunteer',
    request:
      'Draft a thank-you to the volunteer who sorted donations every Saturday this month. ' +
      'Their number is (555) 555-0123.',
    preparedDraft:
      'Thank you for giving your Saturdays to the pantry this month. The donations you sorted ' +
      'reached our shelves faster, and our neighbors noticed. We are lucky to have you on the ' +
      'team. Warmly, the Riverbend Community Pantry team.',
    taskRunId: 'demo-run-volunteer',
  },
  {
    id: 'partner',
    label: 'Thank a partner after the food drive',
    request:
      'Write a thank-you to our partner organization (coordinator@example.com) for co-hosting ' +
      'the fall food drive.',
    // Deliberately includes a contact line (dashed format, which the rule-check matches), so the
    // real rule-check flags it and this run waits for Human Review.
    preparedDraft:
      'Thank you for co-hosting the fall food drive with us. Together we collected more than ' +
      'we hoped, and every shelf is fuller for it. If your team would like to plan the spring ' +
      'drive, call us at 555-555-0142. With thanks, the Riverbend Community Pantry team.',
    taskRunId: 'demo-run-partner',
  },
];

/** A sample audit-trail entry. Detail carries category names only, never values (as the real trail). */
function entry(
  id: string,
  type: AuditRecord['type'],
  at: string,
  taskRunId: string | null,
  detail: AuditRecord['detail'] = {},
): AuditRecord {
  return { id: `demo-event-${id}`, type, at, actor: 'you', taskRunId, detail };
}

/** The sample audit trail, oldest first, in the order the real pipeline writes events. */
export const SAMPLE_TRAIL: AuditRecord[] = [
  entry('1', 'policy_seeded', '2026-11-02T15:00:00.000Z', null, {
    ruleCount: SAMPLE_RULES.length,
  }),
  entry('2', 'pii_stripped', '2026-11-10T14:05:00.000Z', 'demo-run-donor', {
    categories: ['email'],
  }),
  entry('3', 'task_completed', '2026-11-10T14:05:20.000Z', 'demo-run-donor', {
    outcome: 'completed',
  }),
  entry('4', 'pii_stripped', '2026-11-14T16:30:00.000Z', 'demo-run-volunteer', {
    categories: ['phone'],
  }),
  entry('5', 'task_completed', '2026-11-14T16:30:25.000Z', 'demo-run-volunteer', {
    outcome: 'completed',
  }),
  entry('6', 'pii_stripped', '2026-11-18T10:12:00.000Z', 'demo-run-partner', {
    categories: ['email'],
  }),
  entry('7', 'task_completed', '2026-11-18T10:12:30.000Z', 'demo-run-partner', {
    outcome: 'needs_review',
  }),
];
