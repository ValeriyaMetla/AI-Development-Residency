import { describe, it, expect } from 'vitest';
import { navItemsFor, navModelFor, GOVERNANCE_LABEL, type NavNode } from '@/app/components/nav';

/**
 * Role-aware navigation + the "Your AI Governance" grouping. Labels use the standards-flavored
 * set (AI Policy, Human Review, Monitoring, Audit Trail). AI Policy and Audit Trail are
 * Leader-only; everything else is visible to any org member. Routes are unchanged.
 */

function governanceGroup(role: Parameters<typeof navModelFor>[0]) {
  const group = navModelFor(role).find(
    (n): n is Extract<NavNode, { kind: 'group' }> => n.kind === 'group',
  );
  if (!group) throw new Error('governance group missing');
  return group;
}

describe('navItemsFor (role-aware flat list)', () => {
  it('shows the Leader every item in lifecycle order', () => {
    const labels = navItemsFor('accountable_leader').map((i) => i.label);
    expect(labels).toEqual([
      'Home',
      'Co-Pilot',
      'AI Policy',
      'Human Review',
      'Monitoring',
      'Audit Trail',
      'Skills',
    ]);
  });

  it('hides AI Policy and Audit Trail from a Doer (leader-only actions not surfaced)', () => {
    const labels = navItemsFor('frontline_doer').map((i) => i.label);
    expect(labels).toEqual(['Home', 'Co-Pilot', 'Human Review', 'Monitoring', 'Skills']);
    expect(labels).not.toContain('AI Policy');
    expect(labels).not.toContain('Audit Trail');
  });

  it('keeps the audit trail leader-only — hidden for a Doer and unknown role', () => {
    expect(navItemsFor('accountable_leader').map((i) => i.label)).toContain('Audit Trail');
    expect(navItemsFor('frontline_doer').map((i) => i.label)).not.toContain('Audit Trail');
    expect(navItemsFor(null).map((i) => i.label)).not.toContain('Audit Trail');
  });

  it('shows Human Review to everyone (any org member may review, not leader-only)', () => {
    expect(navItemsFor('accountable_leader').map((i) => i.label)).toContain('Human Review');
    expect(navItemsFor('frontline_doer').map((i) => i.label)).toContain('Human Review');
    expect(navItemsFor(null).map((i) => i.label)).toContain('Human Review');
  });

  it('unknown/missing role gets the non-admin set, no leaked admin action', () => {
    const labels = navItemsFor(null).map((i) => i.label);
    expect(labels).not.toContain('AI Policy');
    expect(labels).not.toContain('Audit Trail');
    expect(labels).toContain('Home');
  });
});

describe('navModelFor (grouped desktop model)', () => {
  it('orders the bar as Home, Your AI Governance, Skills', () => {
    const model = navModelFor('accountable_leader');
    expect(model.map((n) => (n.kind === 'group' ? n.label : n.item.label))).toEqual([
      'Home',
      GOVERNANCE_LABEL,
      'Skills',
    ]);
  });

  it('leads the governance group with Co-Pilot (the decide step)', () => {
    expect(governanceGroup('accountable_leader').items[0].label).toBe('Co-Pilot');
  });

  it('gives the Leader the full governance lifecycle in order', () => {
    expect(governanceGroup('accountable_leader').items.map((i) => i.label)).toEqual([
      'Co-Pilot',
      'AI Policy',
      'Human Review',
      'Monitoring',
      'Audit Trail',
    ]);
  });

  it("filters the Doer's governance group to the items they can act on", () => {
    expect(governanceGroup('frontline_doer').items.map((i) => i.label)).toEqual([
      'Co-Pilot',
      'Human Review',
      'Monitoring',
    ]);
  });
});
