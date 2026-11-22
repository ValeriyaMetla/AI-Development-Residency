import { describe, expect, it } from 'vitest';
import { buildDemoPolicy, buildDemoRecord, demoPendingReview } from '@/lib/demo/demo-views';
import { SAMPLE_RULES, SAMPLE_TRAIL } from '@/lib/demo/sample-org';
import { eventWording } from '@/lib/domain/report';

// ADR-0029 T6: the demo's read-only views come from the REAL Domain code, so the demo can't
// describe the policy or the record differently from the product.

describe('demo policy view', () => {
  const doc = buildDemoPolicy();
  const clauses = doc.sections.flatMap((s) => s.clauses);

  it('shows every sample rule exactly once', () => {
    expect(clauses.map((c) => c.text).sort()).toEqual(SAMPLE_RULES.map((r) => r.ruleText).sort());
  });

  it('marks exactly the baseline-safety rules as required', () => {
    for (const rule of SAMPLE_RULES) {
      const clause = clauses.find((c) => c.text === rule.ruleText);
      expect(clause?.required).toBe(rule.isBaselineSafety);
    }
  });

  it('lists each cited standard as a reference', () => {
    const citations = doc.references.map((r) => r.citation);
    for (const rule of SAMPLE_RULES) expect(citations).toContain(rule.citation);
  });

  it('is titled for the sample org and says it was not written by AI', () => {
    expect(doc.title).toBe('Riverbend Community Pantry — AI Use Policy');
    expect(doc.generatedNote).toContain('Not written by AI');
  });
});

describe('demo review view', () => {
  it('is the partner run the real rule-check flagged', () => {
    const run = demoPendingReview();
    expect(run?.preset.id).toBe('partner');
    expect(run?.ruleCheck.result).toBe('flag');
  });
});

describe('demo record view', () => {
  const lines = buildDemoRecord();

  it('has one line per sample entry, oldest first, in the real wording', () => {
    expect(lines.map((l) => l.id)).toEqual(SAMPLE_TRAIL.map((e) => e.id));
    lines.forEach((line, i) => expect(line.wording).toBe(eventWording(SAMPLE_TRAIL[i])));
  });

  it('names the run for run entries and none for the policy entry', () => {
    expect(lines[0].runLabel).toBeNull();
    expect(lines.slice(1).every((l) => l.runLabel)).toBe(true);
  });

  it('formats dates in UTC so they never shift with the visitor time zone', () => {
    expect(lines[1].dateLabel).toBe('10 November 2026');
  });

  it('shows category names only, never a personal value', () => {
    for (const line of lines) expect(line.wording).not.toMatch(/@|555/);
  });
});
