import { describe, it, expect } from 'vitest';
import { navItemsFor } from '@/app/components/nav';

describe('navItemsFor (role-aware nav)', () => {
  it('shows the Leader every item, including Your rules', () => {
    const labels = navItemsFor('accountable_leader').map((i) => i.label);
    expect(labels).toEqual(['Home', 'Skills', 'Co-Pilot', 'Your rules']);
  });

  it('hides Your rules from a Doer (admin action not surfaced)', () => {
    const labels = navItemsFor('frontline_doer').map((i) => i.label);
    expect(labels).toEqual(['Home', 'Skills', 'Co-Pilot']);
    expect(labels).not.toContain('Your rules');
  });

  it('unknown/missing role gets the non-admin set, no leaked admin action', () => {
    const labels = navItemsFor(null).map((i) => i.label);
    expect(labels).not.toContain('Your rules');
    expect(labels).toContain('Home');
  });
});
