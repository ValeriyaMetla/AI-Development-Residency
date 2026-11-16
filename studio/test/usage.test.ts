import { describe, it, expect } from 'vitest';
import { usageViewState } from '@/lib/domain/usage';

describe('usageViewState (Registry view state mapping)', () => {
  it('maps a read failure (null) to error — distinct from empty', () => {
    expect(usageViewState(null)).toBe('error');
  });

  it('maps zero runs to empty', () => {
    expect(usageViewState(0)).toBe('empty');
  });

  it('maps one or more runs to active', () => {
    expect(usageViewState(1)).toBe('active');
    expect(usageViewState(42)).toBe('active');
  });

  it('treats a negative/invalid count as empty, never active', () => {
    expect(usageViewState(-1)).toBe('empty');
  });
});
