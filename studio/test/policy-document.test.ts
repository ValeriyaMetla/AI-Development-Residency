import { describe, it, expect } from 'vitest';
import {
  buildPolicyDocument,
  sectionFor,
  formatVersionDate,
  type DocumentRuleInput,
} from '@/lib/domain/policy-document';
import { generatePolicyRules, type StandardsByCode } from '@/lib/domain/policy-generator';
import { recommendedSeedAnswers } from '@/lib/domain/policy-seed-spec';

/**
 * The readable policy document (Epic 1 portability). Built from the REAL seed categories and
 * citations (mirrors migration 20261113010000_seed_standards.sql), because the placement risk is
 * specific to that data: the locked prohibitions inherit `risk-tiering` from the EU AI Act standard.
 */
const SEED: [code: string, category: string, citation: string][] = [
  ['nist-human-oversight', 'human-oversight', 'NIST AI RMF (2023), GOVERN function'],
  ['nist-document-use', 'accountability-logging', 'NIST AI RMF (2023), MAP function'],
  ['nist-check-output', 'risk-tiering', 'NIST AI RMF (2023), MEASURE function'],
  [
    'euaiact-match-risk',
    'risk-tiering',
    'EU AI Act (Reg. (EU) 2024/1689), Article 5 (prohibited practices)',
  ],
  [
    'euaiact-human-override',
    'human-oversight',
    'EU AI Act (Reg. (EU) 2024/1689), Article 14 (human oversight)',
  ],
  [
    'euaiact-disclose-ai',
    'transparency-provenance',
    'EU AI Act (Reg. (EU) 2024/1689), Article 50 (transparency)',
  ],
  [
    'iso42001-data-governance',
    'data-protection',
    'ISO/IEC 42001:2023, Annex A (data governance controls)',
  ],
  [
    'iso42001-managed-logging',
    'accountability-logging',
    'ISO/IEC 42001:2023 (AI management system)',
  ],
  [
    'iso42001-records',
    'transparency-provenance',
    'ISO/IEC 42001:2023, Annex A (transparency and record-keeping controls)',
  ],
];

function seedStandards(): StandardsByCode {
  return new Map(
    SEED.map(([code, category, citation]) => [
      code,
      {
        id: `sr-${code}`,
        citation,
        ruleText: `Standard text for ${code}.`,
        category,
        riskTier: 'all',
      },
    ]),
  );
}

function starterRules(): DocumentRuleInput[] {
  return generatePolicyRules(recommendedSeedAnswers('Jane Doe'), seedStandards()).map((r) => ({
    ruleText: r.ruleText,
    category: r.category,
    isBaselineSafety: r.isBaselineSafety ?? false,
    citation: r.citation ?? null,
    sourceQuestion: r.sourceQuestion ?? null,
  }));
}

function build(rules = starterRules()) {
  return buildPolicyDocument({
    orgName: 'Hope Street Food Bank',
    versionCreatedAt: '2026-11-19T18:30:00Z',
    rules,
  });
}

const allClauses = (doc: ReturnType<typeof build>) => doc.sections.flatMap((s) => s.clauses);
const sectionOf = (doc: ReturnType<typeof build>, text: string) =>
  doc.sections.find((s) => s.clauses.some((c) => c.text === text))?.heading;

describe('buildPolicyDocument — every rule, nothing invented', () => {
  it('includes every rule exactly once, with its stored text unchanged', () => {
    const rules = starterRules();
    const texts = allClauses(build(rules)).map((c) => c.text);
    expect(texts.sort()).toEqual(rules.map((r) => r.ruleText).sort());
  });

  it('uses each rule’s stored citation verbatim, listed once per distinct standard', () => {
    const rules = starterRules();
    const doc = build(rules);
    const distinct = new Set(rules.map((r) => r.citation).filter(Boolean));
    expect(doc.references.map((r) => r.citation).sort()).toEqual([...distinct].sort());
    for (const clause of allClauses(doc)) {
      const rule = rules.find((r) => r.ruleText === clause.text)!;
      expect(clause.refs.map((n) => doc.references[n - 1].citation)).toEqual([rule.citation]);
    }
  });

  it('never drops a rule it cannot place — it goes to "Other rules"', () => {
    const odd: DocumentRuleInput = {
      ruleText: 'An imported rule with an unknown category.',
      category: 'something-new',
      isBaselineSafety: false,
      citation: null,
      sourceQuestion: null,
    };
    const doc = build([...starterRules(), odd]);
    expect(sectionOf(doc, odd.ruleText)).toBe('Other rules');
    expect(allClauses(doc).find((c) => c.text === odd.ruleText)?.refs).toEqual([]);
  });
});

describe('placement — question first, category as the fallback', () => {
  it('puts the locked prohibitions under Prohibited uses, not Human review (despite risk-tiering)', () => {
    const doc = build();
    const prohibited = doc.sections.find((s) => s.heading === 'Prohibited uses')!;
    expect(prohibited.clauses).toHaveLength(3);
    expect(prohibited.clauses.every((c) => c.required)).toBe(true);
  });

  it('puts the purposes rule under Purpose and scope, not Monitoring', () => {
    const doc = build();
    expect(doc.sections[0].heading).toBe('Purpose and scope');
    expect(doc.sections[0].clauses[0].text).toMatch(/^We use AI for: /);
  });

  it('maps each question to its section, reading "Q4/Q6" as Q4', () => {
    expect(sectionFor({ sourceQuestion: 'Q1', category: 'x' })).toBe('accountability');
    expect(sectionFor({ sourceQuestion: 'Q4/Q6', category: 'x' })).toBe('review');
    expect(sectionFor({ sourceQuestion: 'Q7', category: 'risk-tiering' })).toBe('prohibited');
  });

  it('falls back to category for rules with no question (baselines, custom limits)', () => {
    expect(sectionFor({ sourceQuestion: null, category: 'accountability-logging' })).toBe(
      'monitoring',
    );
    expect(sectionFor({ sourceQuestion: null, category: 'prohibited-use' })).toBe('prohibited');
    expect(sectionFor({ sourceQuestion: null, category: 'transparency-provenance' })).toBe(
      'transparency',
    );
  });
});

describe('document structure', () => {
  it('numbers sections and clauses in order, and ends with "Changing this policy"', () => {
    const doc = build();
    doc.sections.forEach((s, i) => {
      expect(s.number).toBe(i + 1);
      s.clauses.forEach((c, j) => expect(c.number).toBe(`${s.number}.${j + 1}`));
    });
    const last = doc.sections.at(-1)!;
    expect(last.heading).toBe('Changing this policy');
    expect(last.clauses).toEqual([]);
    expect(last.paragraphs.length).toBeGreaterThan(0);
  });

  it('leaves out sections with no rules and renumbers the rest', () => {
    const onlyProhibitions = starterRules().filter((r) => r.sourceQuestion === 'Q7');
    const doc = build(onlyProhibitions);
    expect(doc.sections.map((s) => s.heading)).toEqual(['Prohibited uses', 'Changing this policy']);
    expect(doc.sections[0].clauses[0].number).toBe('1.1');
  });

  it('marks baseline-safety rules as required, and only those', () => {
    const rules = starterRules();
    for (const clause of allClauses(build(rules))) {
      const rule = rules.find((r) => r.ruleText === clause.text)!;
      expect(clause.required).toBe(rule.isBaselineSafety);
    }
  });
});

describe('title block', () => {
  it('shows the org, Active status, the version date, and points to the accountability section', () => {
    const doc = build();
    expect(doc.title).toBe('Hope Street Food Bank — AI Use Policy');
    expect(doc.status).toBe('Active');
    expect(doc.versionLabel).toBe('Version of 19 November 2026');
    const n = doc.sections.find((s) => s.heading === 'Accountability')!.number;
    expect(doc.accountableNote).toBe(`Accountable person: see section ${n}`);
    expect(doc.generatedNote).toMatch(/Not written by AI/);
  });

  it('falls back safely when the org name or date is missing', () => {
    const doc = buildPolicyDocument({ orgName: '  ', versionCreatedAt: 'not-a-date', rules: [] });
    expect(doc.title).toBe('Our organization — AI Use Policy');
    expect(doc.versionLabel).toBe('Current version');
    expect(doc.accountableNote).toBe('Accountable person: not named in this policy');
  });

  it('formats the version date in UTC so it is the same everywhere', () => {
    expect(formatVersionDate('2026-11-19T23:59:00Z')).toBe('19 November 2026');
  });
});
