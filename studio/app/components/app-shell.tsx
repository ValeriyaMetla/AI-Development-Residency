'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Badge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { navItemsFor, navModelFor, type NavItem, type UserRole } from './nav';
import { accessibleLabelWithCount, labelWithCount } from '@/lib/domain/review-waiting';

/** The menu item that carries the waiting-for-review count. */
const REVIEW_HREF = '/approvals';

/**
 * Shared application shell (Presentation layer, ADR-0003). The one chrome every authenticated
 * screen inherits via the app/(app) route-group layout: brand, primary navigation, and an account
 * menu. Accessibility backbone lives here — a skip link, semantic <nav>/<main> landmarks,
 * aria-current on the active tab, and keyboard-operable menus (MUI manages focus) — so each
 * feature screen gets it for free.
 *
 * Primary nav is grouped (nav.ts): Home, a "Your AI Governance" dropdown holding the governance
 * lifecycle (Co-Pilot → AI Policy → Human Review → Monitoring → Audit Trail), then Skills. On
 * small screens the whole thing collapses into the account menu as a flat list.
 */

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ChevronDownIcon() {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      sx={{ width: 18, height: 18 }}
    >
      <path fill="currentColor" d="M7 10l5 5 5-5z" />
    </Box>
  );
}

/**
 * The "Your AI Governance" dropdown (desktop). Owns its own open state; MUI's Menu handles focus
 * trapping, Escape-to-close, and arrow-key navigation, so it is fully keyboard-operable. The
 * trigger reflects the open state (aria-expanded/aria-controls) and shows active when any item
 * inside is the current page.
 */
function GovernanceNav({
  label,
  items,
  pathname,
  pendingReviews,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  pendingReviews: number;
}) {
  // The count shows on the menu button itself, so it's visible without opening the menu.
  const reviewCount = items.some((item) => item.href === REVIEW_HREF) ? pendingReviews : 0;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const groupActive = items.some((item) => isActive(pathname, item.href));
  const menuId = 'governance-menu';

  if (items.length === 0) return null;

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-haspopup="true"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open ? 'true' : undefined}
        endIcon={<ChevronDownIcon />}
        aria-label={accessibleLabelWithCount(label, reviewCount)}
        sx={{
          color: groupActive ? 'primary.main' : 'text.primary',
          fontWeight: groupActive ? 700 : 500,
          bgcolor: groupActive ? 'action.selected' : 'transparent',
        }}
      >
        {labelWithCount(label, reviewCount)}
      </Button>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { maxWidth: 320 } } }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.href}
            component={NextLink}
            href={item.href}
            selected={isActive(pathname, item.href)}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            onClick={() => setAnchorEl(null)}
            sx={{ display: 'block', whiteSpace: 'normal', py: 1 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {item.href === REVIEW_HREF ? labelWithCount(item.label, pendingReviews) : item.label}
            </Typography>
            {item.description ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {item.description}
              </Typography>
            ) : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function AppShell({
  email,
  roleLabel,
  role,
  pendingReviews = 0,
  signOutAction,
  children,
}: {
  email: string;
  roleLabel: string;
  role: UserRole;
  /** Runs waiting for review in the org (0 when none, or when the count couldn't be read). */
  pendingReviews?: number;
  signOutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const navModel = navModelFor(role);
  const mobileNavItems = navItemsFor(role);

  return (
    <>
      {/* Skip link — first focusable element; visible only on focus (WCAG 2.4.1). */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: 8,
          top: -48,
          zIndex: (t) => t.zIndex.appBar + 1,
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: 'background.paper',
          color: 'primary.main',
          boxShadow: 3,
          transition: 'top 120ms ease',
          '&:focus': { top: 8 },
          displayPrint: 'none',
        }}
      >
        Skip to content
      </Box>

      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        // Printouts (e.g. the /report export) are documents, not screens: no app chrome.
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          displayPrint: 'none',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Typography
            variant="h6"
            component={NextLink}
            href="/dashboard"
            sx={{ color: 'text.primary', textDecoration: 'none', fontWeight: 700, mr: 2 }}
          >
            Community AI Workflow Studio
          </Typography>

          <Box
            component="nav"
            aria-label="Primary"
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 0.5,
              flexGrow: 1,
              alignItems: 'center',
            }}
          >
            {navModel.map((node) => {
              if (node.kind === 'group') {
                return (
                  <GovernanceNav
                    key={node.label}
                    label={node.label}
                    items={node.items}
                    pathname={pathname}
                    pendingReviews={pendingReviews}
                  />
                );
              }
              const active = isActive(pathname, node.item.href);
              return (
                <Button
                  key={node.item.href}
                  component={NextLink}
                  href={node.item.href}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    color: active ? 'primary.main' : 'text.primary',
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? 'action.selected' : 'transparent',
                  }}
                >
                  {node.item.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'block', md: 'none' } }} />

          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label={accessibleLabelWithCount('Account menu', pendingReviews)}
            aria-haspopup="true"
            aria-controls={menuOpen ? 'account-menu' : undefined}
            aria-expanded={menuOpen ? 'true' : undefined}
            edge="end"
          >
            {/* On narrow screens the navigation lives in this menu, so the count shows here too.
                Decorative badge: the number is also in the button's accessible name. */}
            <Badge
              badgeContent={pendingReviews}
              color="warning"
              invisible={pendingReviews <= 0}
              slotProps={{ badge: { 'aria-hidden': true } as Record<string, unknown> }}
              sx={{ display: { md: 'none' } }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 15 }}>
                {(email.trim()[0] ?? '?').toUpperCase()}
              </Avatar>
            </Badge>
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 15 }}>
                {(email.trim()[0] ?? '?').toUpperCase()}
              </Avatar>
            </Box>
          </IconButton>

          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {email}
              </Typography>
              {roleLabel ? (
                <Typography variant="caption" color="text.secondary">
                  {roleLabel}
                </Typography>
              ) : null}
            </Box>
            <Divider />

            {/* Navigation collapses into the menu on small screens (flat list). */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {mobileNavItems.map((item) => (
                <MenuItem
                  key={item.href}
                  component={NextLink}
                  href={item.href}
                  selected={isActive(pathname, item.href)}
                  onClick={() => setAnchorEl(null)}
                >
                  {item.href === REVIEW_HREF
                    ? labelWithCount(item.label, pendingReviews)
                    : item.label}
                </MenuItem>
              ))}
              <Divider />
            </Box>

            <Box component="form" action={signOutAction}>
              <MenuItem component="button" type="submit" sx={{ width: '100%' }}>
                Log out
              </MenuItem>
            </Box>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        id="main-content"
        maxWidth="md"
        sx={{ py: 4, '@media print': { py: 0, maxWidth: 'none' } }}
      >
        {children}
      </Container>
    </>
  );
}
