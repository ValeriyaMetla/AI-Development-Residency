import { describe, expect, it } from 'vitest';
import { DEMO_BANNER } from '../app/demo/demo-content';

// The Demo card's acceptance criterion requires this exact banner wording on every demo screen.
describe('demo banner wording (ADR-0029 point 7)', () => {
  it('says exactly what the card requires', () => {
    expect(DEMO_BANNER.heading).toBe('Demo organization — sample data, nothing is saved');
  });

  it('says plainly that no AI runs and nothing is stored', () => {
    expect(DEMO_BANNER.detail).toContain('fictional');
    expect(DEMO_BANNER.detail).toContain('No AI runs here');
    expect(DEMO_BANNER.detail).toContain('nothing you choose is stored');
  });
});
