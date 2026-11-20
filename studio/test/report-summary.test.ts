import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SafetyNetSummary } from '@/lib/domain/usage';
import {
  allTimePeriodLabel,
  composeSummary,
  PERCENT_FLOOR,
  type GovernedAISummary,
  type SummaryInput,
} from '@/lib/domain/report-summary';

const GENERATED_AT = '2026-11-19T12:00:00.000Z';
const OLD = '2026-01-01T00:00:00.000Z'; // well outside the 14-day recency window
const RECENT = '2026-11-10T00:00:00.000Z'; // inside the 14-day window

function safety(partial: Partial<SafetyNetSummary>): SafetyNetSummary {
  const s = {
    cleared: 0,
    needsReview: 0,
    blocked: 0,
    rejected: 0,
    inProgress: 0,
    total: 0,
    ...partial,
  };
  return s;
}

function input(partial: Partial<SummaryInput>): SummaryInput {
  return {
    orgName: 'Helpful Nonprofit',
    generatedAt: GENERATED_AT,
    periodLabel: 'all recorded activity',
    safety: safety({}),
    firstActivityAt: OLD,
    humanReviewedCount: 0,
    policy: null,
    ...partial,
  };
}

/** All human-written template text in a summary (never the computed numbers). */
function textOf(s: GovernedAISummary): string {
  return [
    s.headline,
    s.sampleSize,
    s.caveat ?? '',
    ...s.stats.map((x) => x.label),
    s.humanReviewed?.label ?? '',
  ]
    .join(' | ')
    .toLowerCase();
}

describe('composeSummary — state selection', () => {
  it('no activity → empty state, no breakdown rendered as a result', () => {
    const s = composeSummary(input({ safety: safety({ total: 0 }) }));
    expect(s.state).toBe('empty');
    expect(s.headline).toMatch(/no governed ai activity/i);
    expect(s.stats).toEqual([]);
    expect(s.humanReviewed).toBeNull();
    expect(s.caveat).toBeNull();
    expect(s.sampleSize).not.toHaveLength(0);
  });

  it('few actions → low state with the early-use caveat', () => {
    const s = composeSummary(
      input({ safety: safety({ cleared: 2, total: 2 }), firstActivityAt: OLD }),
    );
    expect(s.state).toBe('low');
    expect(s.caveat).toMatch(/early use/i);
  });

  it('enough actions but only-recent first use → still low (recency rule)', () => {
    const s = composeSummary(
      input({ safety: safety({ cleared: 8, total: 8 }), firstActivityAt: RECENT }),
    );
    expect(s.state).toBe('low');
  });

  it('enough actions and established use → normal, no caveat', () => {
    const s = composeSummary(
      input({ safety: safety({ cleared: 10, needsReview: 2, total: 12 }), firstActivityAt: OLD }),
    );
    expect(s.state).toBe('normal');
    expect(s.caveat).toBeNull();
  });
});

describe('composeSummary — sample size always present', () => {
  it('states the base + period in every state', () => {
    for (const total of [0, 1, 4, 12]) {
      const s = composeSummary(
        input({ safety: safety({ cleared: total, total }), firstActivityAt: OLD }),
      );
      expect(s.sampleSize.length, `total=${total}`).toBeGreaterThan(0);
      expect(s.sampleSize).toMatch(/all recorded activity/);
    }
  });
});

describe('composeSummary — percentage floor (no % on a small base)', () => {
  it(`shows no percentage below a base of ${PERCENT_FLOOR}`, () => {
    const s = composeSummary(input({ safety: safety({ cleared: 5, blocked: 4, total: 9 }) }));
    for (const stat of s.stats) expect(stat.percent, stat.label).toBeNull();
  });

  it(`shows percentages at a base of ${PERCENT_FLOOR} or more`, () => {
    const s = composeSummary(
      input({ safety: safety({ cleared: 7, needsReview: 3, total: 10 }), firstActivityAt: OLD }),
    );
    const completed = s.stats.find((x) => x.label === 'Completed');
    expect(completed?.percent).toBe(70);
  });
});

describe('composeSummary — no overstatement (card 4 counter-metric)', () => {
  const BANNED = ['every', 'consistently', 'always', 'guarantee', 'fully compliant', '100% of'];
  const cases: SummaryInput[] = [
    input({ safety: safety({ total: 0 }) }),
    input({ safety: safety({ cleared: 1, total: 1 }) }),
    input({ safety: safety({ cleared: 3, needsReview: 1, total: 4 }) }),
    input({
      safety: safety({ cleared: 40, needsReview: 6, blocked: 2, rejected: 2, total: 50 }),
      firstActivityAt: OLD,
    }),
  ];

  it('never uses absolute/temporal overstatement wording, for any volume', () => {
    for (const c of cases) {
      const text = textOf(composeSummary(c));
      for (const phrase of BANNED) {
        expect(text, `"${phrase}" leaked at total=${c.safety.total}`).not.toContain(phrase);
      }
    }
  });

  it('a single run is reported as a raw count with no percentage (no "100%")', () => {
    const s = composeSummary(input({ safety: safety({ cleared: 1, total: 1 }) }));
    expect(s.state).toBe('low');
    expect(s.stats.every((x) => x.percent === null)).toBe(true);
    expect(JSON.stringify(s)).not.toContain('100');
  });
});

describe('composeSummary — robustness', () => {
  it('falls back to a neutral org name and clamps negative counts', () => {
    const s = composeSummary(
      input({ orgName: '   ', safety: safety({ cleared: -3, total: 2 }), firstActivityAt: OLD }),
    );
    expect(s.orgName).toBe('Your organization');
    expect(s.stats.find((x) => x.label === 'Completed')?.count).toBe(0);
  });

  it('passes the policy through for the UI, or null for baseline', () => {
    const withPolicy = composeSummary(
      input({
        safety: safety({ cleared: 2, total: 2 }),
        policy: { name: 'Our AI Policy', activeSince: OLD },
      }),
    );
    expect(withPolicy.policy).toEqual({ name: 'Our AI Policy', activeSince: OLD });
    expect(composeSummary(input({ safety: safety({ cleared: 2, total: 2 }) })).policy).toBeNull();
  });
});

describe('allTimePeriodLabel — the all-time period wording', () => {
  it('anchors the period to the first recorded activity (UTC date)', () => {
    expect(allTimePeriodLabel('2026-11-03T23:30:00.000Z')).toBe('the period since 3 Nov 2026');
  });

  it('never invents a start date when there is no activity or the date is unreadable', () => {
    expect(allTimePeriodLabel(null)).toBe('the period to date');
    expect(allTimePeriodLabel('not-a-date')).toBe('the period to date');
  });

  it('reads naturally inside the composed sample-size line', () => {
    const s = composeSummary(
      input({
        safety: safety({ cleared: 12, total: 12 }),
        periodLabel: allTimePeriodLabel(OLD),
      }),
    );
    expect(s.sampleSize).toBe('Based on 12 governed actions over the period since 1 Jan 2026.');
  });
});

describe('counter-metric — no content ever reaches the summary or its printout (export card)', () => {
  // Columns that hold what a person typed or a model wrote — the summary must never read them.
  const CONTENT_COLUMNS = ['input_summary', 'content', 'note', 'self_critique_result', '*'];

  /** The `.select('…')` projections inside one function's source. */
  function selectsIn(file: string, fnName: string): string[] {
    const src = readFileSync(file, 'utf8');
    const start = src.indexOf(`export async function ${fnName}`);
    expect(start, `${fnName} not found in ${file}`).toBeGreaterThan(-1);
    const next = src.indexOf('\nexport ', start + 1);
    const body = src.slice(start, next === -1 ? undefined : next);
    return [...body.matchAll(/\.select\(\s*'([^']*)'/g)].map((m) => m[1]);
  }

  it('the summary reads select only allow-listed, non-content columns', () => {
    const projections = [
      ...selectsIn('lib/data/report.ts', 'getSummaryInputs'),
      // getSummaryInputs reuses the usage reader for the all-time run counts.
      ...selectsIn('lib/data/usage.ts', 'getRunSummariesSince'),
    ];
    expect(projections.length).toBeGreaterThanOrEqual(3);
    for (const projection of projections) {
      const columns = projection.split(/[\s,():]+/).filter(Boolean);
      for (const banned of CONTENT_COLUMNS) {
        expect(columns, `summary read "${projection}" selects ${banned}`).not.toContain(banned);
      }
    }
  });

  it('the composed summary carries only its templated fields — no slot for run content', () => {
    const s = composeSummary(
      input({
        safety: safety({ cleared: 12, total: 12 }),
        humanReviewedCount: 3,
        policy: { name: 'Our AI Policy', activeSince: OLD },
      }),
    );
    expect(Object.keys(s).sort()).toEqual(
      [
        'caveat',
        'generatedAt',
        'headline',
        'humanReviewed',
        'orgName',
        'periodLabel',
        'policy',
        'protection',
        'sampleSize',
        'state',
        'stats',
      ].sort(),
    );
  });
});
