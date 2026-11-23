import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { AUTH_BRAND } from './auth/auth-content';
import { FOOTER, HELLO_EMAIL } from './site-footer-content';

/**
 * Shared footer for the public pages: landing, `/demo` and `/your-data` (card "Add a footer to the
 * landing page and demo"). Presentation only — no data access. One component, so the three pages
 * can't drift apart.
 *
 * Accessibility: a <footer> landmark (outside <main>) with a labelled <nav>; each link group is a
 * real list under a small heading (<h2>, visually small) so screen readers can jump between
 * groups. Text stays `text.primary` / `text.secondary` on the default background for AA contrast;
 * links are underlined on hover and focus, and keep the theme's visible focus outline.
 */
export function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        py: { xs: 5, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 4, md: 6 },
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{AUTH_BRAND.name}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {FOOTER.tagline}
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              {FOOTER.contactLead} <Link href={`mailto:${HELLO_EMAIL}`}>{HELLO_EMAIL}</Link>
            </Typography>
          </Box>

          <Box
            component="nav"
            aria-label="Footer"
            sx={{
              display: 'grid',
              gap: { xs: 4, md: 6 },
              gridTemplateColumns: '1fr 1fr',
              gridColumn: { sm: 'span 2' },
            }}
          >
            {FOOTER.groups.map((group) => (
              <Box key={group.heading}>
                <Typography
                  component="h2"
                  variant="overline"
                  sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 1 }}
                >
                  {group.heading}
                </Typography>
                <Box
                  component="ul"
                  sx={{ listStyle: 'none', p: 0, m: 0, mt: 1, display: 'grid', gap: 1 }}
                >
                  {group.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        component={NextLink}
                        href={l.href}
                        underline="hover"
                        sx={{ color: 'text.primary' }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}
        >
          {FOOTER.notLegalAdvice}
        </Typography>
      </Container>
    </Box>
  );
}
