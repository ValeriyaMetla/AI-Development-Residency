import { describe, it, expect } from 'vitest';
import {
  buildCritiquePrompt,
  parseCritique,
  critiqueToFinding,
  critiqueUnavailableFinding,
  critiqueSummary,
  CRITIQUE_UNAVAILABLE_REASON,
} from '@/lib/domain/self-critique';

describe('buildCritiquePrompt', () => {
  it('states the reviewer role, the task intent, and the strict JSON contract', () => {
    const p = buildCritiquePrompt('Write a warm thank-you note.');
    expect(p).toContain('Challenger');
    expect(p).toContain('Write a warm thank-you note.');
    expect(p).toContain('"verdict"');
    expect(p).toMatch(/pass/);
    expect(p).toMatch(/revise/);
    expect(p).toMatch(/block/);
  });

  it('omits the policy block when there are no rules', () => {
    const p = buildCritiquePrompt('Draft something.');
    expect(p).not.toContain("organization's AI policy");
  });

  it('includes the active policy rules when present', () => {
    const p = buildCritiquePrompt('Draft something.', [
      { ruleText: 'A person has the final say.' },
      { ruleText: 'Minimize personal information.' },
    ]);
    expect(p).toContain("organization's AI policy");
    expect(p).toContain('- A person has the final say.');
    expect(p).toContain('- Minimize personal information.');
  });
});

describe('parseCritique — happy paths', () => {
  it('parses a clean pass verdict', () => {
    const r = parseCritique('{"verdict":"pass","reason":"Looks good."}');
    expect(r).toEqual({ verdict: 'pass', reason: 'Looks good.', revisedText: null });
  });

  it('parses a revise verdict and keeps the revised draft', () => {
    const r = parseCritique(
      '{"verdict":"revise","reason":"Too formal.","revised":"Thanks so much!"}',
    );
    expect(r?.verdict).toBe('revise');
    expect(r?.revisedText).toBe('Thanks so much!');
  });

  it('parses a block verdict with no revised text', () => {
    const r = parseCritique('{"verdict":"block","reason":"Contains unsafe advice."}');
    expect(r).toEqual({
      verdict: 'block',
      reason: 'Contains unsafe advice.',
      revisedText: null,
    });
  });
});

describe('parseCritique — tolerant extraction', () => {
  it('strips code fences and surrounding prose', () => {
    const r = parseCritique(
      'Here is my review:\n```json\n{"verdict":"pass","reason":"Fine."}\n```\nThanks!',
    );
    expect(r?.verdict).toBe('pass');
    expect(r?.reason).toBe('Fine.');
  });
});

describe('parseCritique — defensive (fails closed via null)', () => {
  it('returns null for non-JSON text', () => {
    expect(parseCritique('I think this draft is fine, honestly.')).toBeNull();
  });
  it('returns null for an empty response', () => {
    expect(parseCritique('')).toBeNull();
  });
  it('returns null for an unknown verdict', () => {
    expect(parseCritique('{"verdict":"maybe","reason":"unsure"}')).toBeNull();
  });
  it('returns null for malformed JSON', () => {
    expect(parseCritique('{"verdict":"pass", "reason":}')).toBeNull();
  });
});

describe('parseCritique — normalization', () => {
  it('drops revised text when the verdict is not revise', () => {
    const r = parseCritique('{"verdict":"pass","reason":"Fine.","revised":"ignored"}');
    expect(r?.revisedText).toBeNull();
  });
  it('treats an empty revised string on revise as no re-draft', () => {
    const r = parseCritique('{"verdict":"revise","reason":"Fix tone.","revised":"  "}');
    expect(r?.verdict).toBe('revise');
    expect(r?.revisedText).toBeNull();
  });
  it('falls back to a default reason when none is given', () => {
    const r = parseCritique('{"verdict":"pass"}');
    expect(r?.reason.length).toBeGreaterThan(0);
  });
});

describe('critiqueToFinding — verdict maps to severity', () => {
  it('pass -> pass', () => {
    expect(critiqueToFinding({ verdict: 'pass', reason: 'ok', revisedText: null }).result).toBe(
      'pass',
    );
  });
  it('revise -> flag (surfaced, never silently final)', () => {
    expect(critiqueToFinding({ verdict: 'revise', reason: 'fixed', revisedText: 'x' }).result).toBe(
      'flag',
    );
  });
  it('block -> block', () => {
    expect(
      critiqueToFinding({ verdict: 'block', reason: 'unsafe', revisedText: null }).result,
    ).toBe('block');
  });
});

describe('fail-closed + summary helpers', () => {
  it('critiqueUnavailableFinding flags for human review with a plain reason', () => {
    const f = critiqueUnavailableFinding();
    expect(f.result).toBe('flag');
    expect(f.reason).toBe(CRITIQUE_UNAVAILABLE_REASON);
  });
  it('critiqueSummary reports unavailable when the critique is null', () => {
    expect(critiqueSummary(null)).toContain('unavailable');
  });
  it('critiqueSummary is verdict + reason, no payload', () => {
    expect(critiqueSummary({ verdict: 'revise', reason: 'Softened tone.', revisedText: 'x' })).toBe(
      'revise: Softened tone.',
    );
  });
});
