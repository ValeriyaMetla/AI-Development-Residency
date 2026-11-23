import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { FAQ } from './faq-content';

/**
 * Landing-page FAQ (card "Add an FAQ section to the landing page"), just before the final call to
 * action. Presentation only — no data access, so the Leak Test holds. All wording lives in
 * `faq-content.ts`, which is traced to code and ADRs and guarded by a test.
 *
 * Accessibility: each question is a native <details>/<summary>, so it opens with Enter or Space,
 * announces its expanded state to screen readers, and needs no JavaScript. The summary text is an
 * <h3> under the section's <h2>, so the questions also appear in a screen reader's heading list.
 * The open/closed marker is decorative; the state is carried by the element itself.
 */
export function Faq() {
  return (
    <Box
      component="section"
      aria-labelledby="faq-heading"
      sx={{ py: { xs: 8, md: 11 }, bgcolor: 'background.default' }}
    >
      <Container maxWidth="md">
        <Typography
          id="faq-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.875rem', md: '2.25rem' }, lineHeight: 1.2, mb: 4 }}
        >
          {FAQ.heading}
        </Typography>

        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          {FAQ.items.map((item) => (
            <Box
              component="details"
              key={item.question}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& > summary': {
                  listStyle: 'none',
                  cursor: 'pointer',
                  py: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                },
                '& > summary::-webkit-details-marker': { display: 'none' },
                '& > summary:focus-visible': {
                  outline: '3px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
                '& .faq-marker': { transition: 'transform 0.2s' },
                '&[open] .faq-marker': { transform: 'rotate(45deg)' },
              }}
            >
              <summary>
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 600, fontSize: '1.1rem' }}
                >
                  {item.question}
                </Typography>
                <Box
                  component="span"
                  className="faq-marker"
                  aria-hidden="true"
                  sx={{ fontSize: '1.5rem', lineHeight: 1, color: 'primary.main', flexShrink: 0 }}
                >
                  +
                </Box>
              </summary>
              <Box sx={{ pb: 2.5 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  {item.answer}
                </Typography>
                {'link' in item && item.link ? (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <Link component={NextLink} href={item.link.href}>
                      {item.link.label}
                    </Link>
                  </Typography>
                ) : null}
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
