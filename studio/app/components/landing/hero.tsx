import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

/**
 * Landing-page hero (section 1 of 7) — two-column: the pitch beside an illustrative "governed run"
 * preview card.
 *
 * Copy is drawn from the locked positioning statement (Week 2 Market Research, Notion) and limited
 * to what Release 1b actually ships — no Justice Layer claim (MMP), no "every output is
 * human-reviewed" (only flagged runs go to a person), no funder-export claim. The preview card is a
 * static, clearly-illustrative mock of the real Skill runner (draft + status + provenance), not live
 * data. Presentation only — no data access, so the Leak Test trivially holds.
 */

const PROMISES = [
  'Free safety net, always',
  'Decisions about people go to a person',
  'Not legal advice',
] as const;

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      sx={{ width: size, height: size, flexShrink: 0, color: 'success.main' }}
    >
      <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
    </Box>
  );
}

export function Hero() {
  return (
    <Box
      component="section"
      aria-labelledby="hero-heading"
      sx={{ py: { xs: 8, md: 13 }, bgcolor: 'background.default' }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 5, md: 7 },
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Left — the pitch */}
          <Box sx={{ flex: '1 1 460px', minWidth: 0 }}>
            <Typography
              component="p"
              variant="overline"
              sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
            >
              For small nonprofits
            </Typography>

            <Typography
              id="hero-heading"
              variant="h2"
              component="h1"
              sx={{
                fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
                lineHeight: 1.12,
                mt: 1,
              }}
            >
              AI that does your nonprofit&rsquo;s work — and keeps it safe.
            </Typography>

            <Typography
              variant="h6"
              component="p"
              sx={{ color: 'text.secondary', fontWeight: 400, mt: 3, maxWidth: '36rem' }}
            >
              Set your AI rules in about five minutes. Then draft real work — thank-you notes,
              updates, summaries — with personal data stripped out, your rules checked, risky tasks
              sent to a person, and every result clearly labeled.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 4 }}>
              <Button component={NextLink} href="/signup" variant="contained" size="large">
                Get started free
              </Button>
              <Button component={NextLink} href="/login" variant="outlined" size="large">
                Log in
              </Button>
              {/* Lightest weight on purpose: sign-up stays the main action (ADR-0029, T7). */}
              <Button component={NextLink} href="/demo" variant="text" size="large">
                Try the demo
                <Box component="span" aria-hidden="true" sx={{ ml: 0.75 }}>
                  →
                </Box>
              </Button>
            </Box>

            <Box
              component="ul"
              aria-label="Our promises"
              sx={{
                listStyle: 'none',
                p: 0,
                m: 0,
                mt: 4,
                display: 'flex',
                flexWrap: 'wrap',
                columnGap: 3,
                rowGap: 1.5,
              }}
            >
              {PROMISES.map((promise) => (
                <Box
                  component="li"
                  key={promise}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <CheckIcon />
                  <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                    {promise}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right — illustrative "governed run" preview (decorative; a mock of the real runner) */}
          <Box sx={{ flex: '1 1 360px', minWidth: 0, width: '100%' }} aria-hidden="true">
            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', boxShadow: 3 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Draft a thank-you
                </Typography>
                <Chip size="small" color="success" label="Ready to review" />
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.5 }}
              >
                Maria — her $50 monthly gift and volunteering at the food drive
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 1.5,
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1.5,
                  lineHeight: 1.6,
                }}
              >
                Dear Maria, thank you so much — your monthly gift and your time at the food drive
                keep our doors open and our families fed. We&rsquo;re so grateful to have you with
                us.
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon size={16} />
                <Typography variant="caption" color="text.secondary">
                  AI-generated with Claude · reviewed by a person
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
