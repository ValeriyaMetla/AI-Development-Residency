import { describe, it, expect } from 'vitest';
import { navItemsFor } from '@/app/components/nav';

describe('navItemsFor (role-aware nav)', () => {
  it('shows the Leader every item, including Your rules and Report', () => {
    const labels = navItemsFor('accountable_leader').map((i) => i.label);
    expect(labels).toEqual([
      'Home',
      'Skills',
      'Approvals',
      'Co-Pilot',
      'Usage',
      'Your rules',
      'Report',
    ]);
  });

  it('hides Your rules and Report from a Doer (leader-only actions not surfaced)', () => {
    const labels = navItemsFor('frontline_doer').map((i) => i.label);
    expect(labels).toEqual(['Home', 'Skills', 'Approvals', 'Co-Pilot', 'Usage']);
    expect(labels).not.toContain('Your rules');
    expect(labels).not.toContain('Report');
  });

  it('keeps the audit trail (Report) leader-only — hidden for a Doer and unknown role', () => {
    expect(navItemsFor('accountable_leader').map((i) => i.label)).toContain('Report');
    expect(navItemsFor('frontline_doer').map((i) => i.label)).not.toContain('Report');
    expect(navItemsFor(null).map((i) => i.label)).not.toContain('Report');
  });

  it('shows Approvals to everyone (any org member may review, not leader-only)', () => {
    expect(navItemsFor('accountable_leader').map((i) => i.label)).toContain('Approvals');
    expect(navItemsFor('frontline_doer').map((i) => i.label)).toContain('Approvals');
    expect(navItemsFor(null).map((i) => i.label)).toContain('Approvals');
  });

  it('unknown/missing role gets the non-admin set, no leaked admin action', () => {
    const labels = navItemsFor(null).map((i) => i.label);
    expect(labels).not.toContain('Your rules');
    expect(labels).toContain('Home');
  });
});
