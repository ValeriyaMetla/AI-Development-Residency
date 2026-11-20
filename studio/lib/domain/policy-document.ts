import type { PolicyRule } from '@/lib/data/policy';

/**
 * Readable policy document — PURE builder (Domain layer, ADR-0003; Epic 1 portability).
 *
 * Turns the org's active rules into a formal AI-use policy: numbered sections, numbered clauses,
 * and a numbered References list of the source standards. Deterministic and template-only — NO
 * model call. Every clause is a rule's own stored text and every reference is a rule's own stored
 * citation; the only fixed wording added here is each section's one-line intro, the "Changing this
 * policy" section, and the generated-by note. Every rule appears exactly once (an unmatched rule
 * goes to "Other rules", never dropped); a section with no rules is left out. Type-only import, so
 * this stays free of data access.
 *
 * Placement: by the intake question a rule came from (sourceQuestion) first, because category alone
 * misplaces seeded rules — e.g. the locked prohibitions inherit `risk-tiering` from the EU AI Act
 * standard they cite. Category is the fallback for rules with no question (baselines, edited,
 * suggested, imported rules).
 */

export type DocumentRuleInput = Pick<
  PolicyRule,
  'ruleText' | 'category' | 'isBaselineSafety' | 'citation' | 'sourceQuestion'
>;

export type PolicyDocumentClause = {
  /** e.g. "3.1" */
  number: string;
  text: string;
  /** Baseline-safety rule: part of the built-in safety net, can't be removed. */
  required: boolean;
  /** Numbers into `references`; empty when the rule has no citation. */
  refs: number[];
};

export type PolicyDocumentSection = {
  number: number;
  heading: string;
  intro: string;
  clauses: PolicyDocumentClause[];
  /** Fixed paragraphs for template-only sections (no rules). */
  paragraphs: string[];
};

export type PolicyDocument = {
  title: string;
  status: 'Active';
  /** "Version of 19 November 2026" — the date this version was created. */
  versionLabel: string;
  accountableNote: string;
  generatedNote: string;
  sections: PolicyDocumentSection[];
  references: { number: number; citation: string }[];
};

type SectionKey =
  | 'purpose'
  | 'accountability'
  | 'prohibited'
  | 'data'
  | 'review'
  | 'transparency'
  | 'monitoring'
  | 'other';

/** Fixed section order, headings, and one-line intros (the only template prose). */
const SECTIONS: { key: SectionKey; heading: string; intro: (org: string) => string }[] = [
  {
    key: 'purpose',
    heading: 'Purpose and scope',
    intro: (org) =>
      `This policy sets how ${org} uses AI tools. It applies to everyone who uses AI for ${org}'s work.`,
  },
  {
    key: 'accountability',
    heading: 'Accountability',
    intro: () =>
      'A named person is responsible for how AI is used here. AI assists; people decide.',
  },
  {
    key: 'prohibited',
    heading: 'Prohibited uses',
    intro: () => 'These uses of AI are never allowed.',
  },
  {
    key: 'data',
    heading: 'Protecting personal and sensitive data',
    intro: () => 'How we protect personal and sensitive information when using AI.',
  },
  {
    key: 'review',
    heading: 'Human review for higher-stakes work',
    intro: () => 'How we check AI-assisted work, with more care the higher the stakes.',
  },
  {
    key: 'transparency',
    heading: 'Transparency and record-keeping',
    intro: () =>
      'How we are open about our use of AI and keep records of how AI-assisted work was produced.',
  },
  {
    key: 'monitoring',
    heading: 'Monitoring and review',
    intro: () => 'How we track and review our use of AI over time.',
  },
  {
    key: 'other',
    heading: 'Other rules',
    intro: () => 'Additional rules set by our organization.',
  },
];

const CHANGING_HEADING = 'Changing this policy';
const CHANGING_PARAGRAPHS = [
  'This policy is managed in the Community AI Workflow Studio. Each change is published as a new version, and earlier versions are kept.',
  'Rules marked Required are part of the built-in safety baseline and cannot be removed.',
];

const BY_QUESTION: Record<string, SectionKey> = {
  Q1: 'accountability',
  Q2: 'purpose',
  Q3: 'data',
  Q4: 'review',
  Q6: 'review',
  Q5: 'transparency',
  Q7: 'prohibited',
};

const BY_CATEGORY: Record<string, SectionKey> = {
  'human-oversight': 'accountability',
  'prohibited-use': 'prohibited',
  'data-protection': 'data',
  'risk-tiering': 'review',
  'transparency-provenance': 'transparency',
  'accountability-logging': 'monitoring',
};

/** Which section a rule belongs in: its question first ("Q4/Q6" → Q4), then its category. */
export function sectionFor(
  rule: Pick<DocumentRuleInput, 'category' | 'sourceQuestion'>,
): SectionKey {
  const q = rule.sourceQuestion?.match(/Q\d+/)?.[0];
  if (q && BY_QUESTION[q]) return BY_QUESTION[q];
  return BY_CATEGORY[rule.category] ?? 'other';
}

/** "19 November 2026" — fixed locale + UTC so the label is the same wherever it renders. */
export function formatVersionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function buildPolicyDocument(input: {
  orgName: string;
  versionCreatedAt: string;
  rules: DocumentRuleInput[];
}): PolicyDocument {
  const org = input.orgName.trim() || 'Our organization';

  // Group rules by section, keeping their stored order within each section.
  const grouped = new Map<SectionKey, DocumentRuleInput[]>();
  for (const rule of input.rules) {
    const key = sectionFor(rule);
    grouped.set(key, [...(grouped.get(key) ?? []), rule]);
  }

  // References are numbered by first appearance in the document; one entry per distinct citation.
  const refNumbers = new Map<string, number>();
  const references: PolicyDocument['references'] = [];
  const refFor = (citation: string | null): number[] => {
    const c = citation?.trim();
    if (!c) return [];
    if (!refNumbers.has(c)) {
      refNumbers.set(c, references.length + 1);
      references.push({ number: references.length + 1, citation: c });
    }
    return [refNumbers.get(c)!];
  };

  const sections: PolicyDocumentSection[] = [];
  for (const def of SECTIONS) {
    const rules = grouped.get(def.key);
    if (!rules?.length) continue; // a section with no rules is left out, never padded
    const number = sections.length + 1;
    sections.push({
      number,
      heading: def.heading,
      intro: def.intro(org),
      clauses: rules.map((r, i) => ({
        number: `${number}.${i + 1}`,
        text: r.ruleText,
        required: r.isBaselineSafety,
        refs: refFor(r.citation),
      })),
      paragraphs: [],
    });
  }
  sections.push({
    number: sections.length + 1,
    heading: CHANGING_HEADING,
    intro: '',
    clauses: [],
    paragraphs: CHANGING_PARAGRAPHS,
  });

  const accountabilitySection = sections.find((s) => s.heading === 'Accountability');
  const date = formatVersionDate(input.versionCreatedAt);

  return {
    title: `${org} — AI Use Policy`,
    status: 'Active',
    versionLabel: date ? `Version of ${date}` : 'Current version',
    accountableNote: accountabilitySection
      ? `Accountable person: see section ${accountabilitySection.number}`
      : 'Accountable person: not named in this policy',
    generatedNote:
      "Generated from this organization's active AI rules and recognized standards. Not written by AI.",
    sections,
    references,
  };
}
