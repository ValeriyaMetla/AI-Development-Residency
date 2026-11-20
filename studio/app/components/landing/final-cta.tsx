import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

/**
 * Landing-page "Final CTA" (section 7 of 7).
 *
 * One clear next step — the same "about five minutes" promise and the free framing from the hero,
 * no new claims. A full-width accent band for emphasis; the button colors use the theme's
 * contrast tokens for AA readability. Presentation only — no data access, so the Leak Test holds.
 */

export function FinalCta() {
  return (
    <Box
      component="section"
      aria-labelledby="final-cta-heading"
      sx={{ py: { xs: 10, md: 14 }, bgcolor: 'primary.main', color: 'primary.contrastText' }}
    >
      <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
        <Typography
          id="final-cta-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.875rem', md: '2.5rem' }, lineHeight: 1.2 }}
        >
          Set your rules in about five minutes
        </Typography>
        <Typography variant="h6" component="p" sx={{ fontWeight: 400, mt: 2, opacity: 0.92 }}>
          Start using AI for your mission — safely — today.
        </Typography>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            component={NextLink}
            href="/signup"
            variant="contained"
            size="large"
            sx={{
              bgcolor: 'background.paper',
              color: 'primary.main',
              '&:hover': { bgcolor: 'background.default' },
            }}
          >
            Get started free
          </Button>
          <Button
            component={NextLink}
            href="/login"
            variant="outlined"
            size="large"
            sx={{
              color: 'primary.contrastText',
              borderColor: 'primary.contrastText',
              '&:hover': { borderColor: 'primary.contrastText', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Log in
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
