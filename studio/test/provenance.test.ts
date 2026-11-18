import { describe, it, expect } from 'vitest';
import { composeProvenance, AI_PROVENANCE } from '@/lib/domain/provenance';

/**
 * Provenance composition (ADR-0022) — the single source of truth for the human-involvement label.
 * One run-state in, one honest label out.
 */
describe('composeProvenance', () => {
  it('unreviewed → the plain AI label', () => {
    expect(composeProvenance({ approved: false, edited: false })).toBe(AI_PROVENANCE);
  });

  it('approved without an edit → reviewed by a person', () => {
    expect(composeProvenance({ approved: true, edited: false })).toBe(
      `${AI_PROVENANCE} — reviewed by a person`,
    );
  });

  it('edited → edited and approved by a person', () => {
    expect(composeProvenance({ approved: true, edited: true })).toBe(
      `${AI_PROVENANCE} — edited and approved by a person`,
    );
  });

  it('an edit always reads as edited+approved (editing happens on approval)', () => {
    expect(composeProvenance({ approved: false, edited: true })).toContain('edited and approved');
  });
});
