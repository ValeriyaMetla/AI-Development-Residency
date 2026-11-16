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
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { navItemsFor, type UserRole } from './nav';

/**
 * Shared application shell (Presentation layer, ADR-0003). The one chrome every
 * authenticated screen inherits via the app/(app) route-group layout: brand,
 * primary navigation, and an account menu. Accessibility backbone lives here —
 * a skip link, semantic <nav>/<main> landmarks, aria-current on the active tab,
 * and a keyboard-operable account menu (MUI manages focus) — so each feature
 * screen gets it for free.
 */

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({
  email,
  roleLabel,
  role,
  signOutAction,
  children,
}: {
  email: string;
  roleLabel: string;
  role: UserRole;
  signOutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const navItems = navItemsFor(role);

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
        }}
      >
        Skip to content
      </Box>

      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
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
            sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, flexGrow: 1 }}
          >
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Button
                  key={item.href}
                  component={NextLink}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    color: active ? 'primary.main' : 'text.primary',
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? 'action.selected' : 'transparent',
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'block', md: 'none' } }} />

          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="Account menu"
            aria-haspopup="true"
            aria-controls={menuOpen ? 'account-menu' : undefined}
            aria-expanded={menuOpen ? 'true' : undefined}
            edge="end"
          >
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 15 }}>
              {(email.trim()[0] ?? '?').toUpperCase()}
            </Avatar>
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

            {/* Navigation collapses into the menu on small screens. */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {navItems.map((item) => (
                <MenuItem
                  key={item.href}
                  component={NextLink}
                  href={item.href}
                  selected={isActive(pathname, item.href)}
                  onClick={() => setAnchorEl(null)}
                >
                  {item.label}
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

      <Container component="main" id="main-content" maxWidth="md" sx={{ py: 4 }}>
        {children}
      </Container>
    </>
  );
}
