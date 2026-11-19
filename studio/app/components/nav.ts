/**
 * Navigation model (Presentation layer) — kept as a pure, framework-free module so the role filter
 * is unit-testable without rendering the client shell. The shell (app-shell.tsx) renders these.
 */

export type UserRole = 'accountable_leader' | 'frontline_doer' | null;

export type NavItem = { label: string; href: string; leaderOnly?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Skills', href: '/skills' },
  // Approvals (the human-review queue, Chunk 2 Wave 3). Flagged runs land here for a person to
  // approve/reject. Visible to everyone — any org member may review in the MVP (ADR-0020), not a
  // leader-only admin action.
  { label: 'Approvals', href: '/approvals' },
  { label: 'Co-Pilot', href: '/copilot' },
  // Usage (Registry view, Chunk 3) — oversight the whole org can see; a Doer uses it for their
  // own entries, a Leader for org-wide totals. Not leader-only (transparency, not surveillance).
  { label: 'Usage', href: '/dashboard/usage' },
  // Administering the policy is a Leader action; a Doer sees the rules that apply in-context in the
  // runner, not as a top nav item (Epic 3 role-aware card). Route-guard authorization is separate.
  { label: 'Your rules', href: '/policy-seed', leaderOnly: true },
  // Audit trail (funder-ready proof, Epic #7). Leader-only — the full org record is a leadership
  // artifact; a Doer sees only their own activity under Usage. The page re-checks the role server-side.
  { label: 'Report', href: '/report', leaderOnly: true },
];

/**
 * Nav items for a role: leader-only items appear only for the Accountable Leader. An unknown or
 * missing role (null) gets the non-admin set — never a leaked admin action.
 */
export function navItemsFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.leaderOnly || role === 'accountable_leader');
}
