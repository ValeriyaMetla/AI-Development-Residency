/**
 * Navigation model (Presentation layer) — a pure, framework-free module so the role filter and the
 * governance grouping are unit-testable without rendering the client shell. The shell
 * (app-shell.tsx) renders these.
 *
 * The Co-Pilot plus the four oversight tools are grouped under "Your AI Governance" and ordered as
 * the governance lifecycle: decide (Co-Pilot) → set the rules (AI Policy) → review (Human Review)
 * → monitor (Monitoring) → prove (Audit Trail). Labels use the standards-flavored names; the
 * routes are unchanged (only the visible labels moved), so no links or guards break.
 */

export type UserRole = 'accountable_leader' | 'frontline_doer' | null;

export type NavItem = {
  label: string;
  href: string;
  leaderOnly?: boolean;
  /** One-line description shown beneath the label in the governance dropdown. */
  description?: string;
};

export type NavNode =
  { kind: 'link'; item: NavItem } | { kind: 'group'; label: string; items: NavItem[] };

const HOME: NavItem = { label: 'Home', href: '/dashboard' };
const SKILLS: NavItem = { label: 'Skills', href: '/skills' };

export const GOVERNANCE_LABEL = 'Your AI Governance';

/**
 * The governance lifecycle, in order. Co-Pilot leads as the "decide" step. AI Policy and Audit
 * Trail are Leader-only (administering the policy and reading the full org record are leadership
 * actions); a Doer's group still shows Co-Pilot, Human Review, and Monitoring.
 */
export const GOVERNANCE_ITEMS: NavItem[] = [
  {
    label: 'Co-Pilot',
    href: '/copilot',
    description: 'Not sure if AI is OK for a task? Get a policy-grounded call before you act.',
  },
  {
    label: 'AI Policy',
    href: '/policy-seed',
    leaderOnly: true,
    description: 'The rules every run follows — view and edit.',
  },
  {
    label: 'Human Review',
    href: '/approvals',
    description: 'Runs flagged for a person wait here.',
  },
  {
    label: 'Monitoring',
    href: '/dashboard/usage',
    description: "Who's using what, across the org.",
  },
  {
    label: 'Audit Trail',
    href: '/report',
    leaderOnly: true,
    description: 'A funder-ready record of every run.',
  },
];

/**
 * All nav items as a flat list (Home, the governance items in lifecycle order, Skills). Used by
 * the mobile account menu, which flattens navigation into a single list.
 */
export const NAV_ITEMS: NavItem[] = [HOME, ...GOVERNANCE_ITEMS, SKILLS];

function visibleFor(role: UserRole, items: NavItem[]): NavItem[] {
  return items.filter((item) => !item.leaderOnly || role === 'accountable_leader');
}

/**
 * Flat, role-filtered list: leader-only items appear only for the Accountable Leader. An unknown
 * or missing role (null) gets the non-admin set — never a leaked admin action.
 */
export function navItemsFor(role: UserRole): NavItem[] {
  return visibleFor(role, NAV_ITEMS);
}

/**
 * The desktop nav model: Home, then the "Your AI Governance" group (role-filtered), then Skills.
 */
export function navModelFor(role: UserRole): NavNode[] {
  return [
    { kind: 'link', item: HOME },
    { kind: 'group', label: GOVERNANCE_LABEL, items: visibleFor(role, GOVERNANCE_ITEMS) },
    { kind: 'link', item: SKILLS },
  ];
}
