/**
 * Navigation model (Presentation layer) — kept as a pure, framework-free module so the role filter
 * is unit-testable without rendering the client shell. The shell (app-shell.tsx) renders these.
 */

export type UserRole = 'accountable_leader' | 'frontline_doer' | null;

export type NavItem = { label: string; href: string; leaderOnly?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Skills', href: '/skills' },
  { label: 'Co-Pilot', href: '/copilot' },
  // Administering the policy is a Leader action; a Doer sees the rules that apply in-context in the
  // runner, not as a top nav item (Epic 3 role-aware card). Route-guard authorization is separate.
  { label: 'Your rules', href: '/policy-seed', leaderOnly: true },
];

/**
 * Nav items for a role: leader-only items appear only for the Accountable Leader. An unknown or
 * missing role (null) gets the non-admin set — never a leaked admin action.
 */
export function navItemsFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.leaderOnly || role === 'accountable_leader');
}
