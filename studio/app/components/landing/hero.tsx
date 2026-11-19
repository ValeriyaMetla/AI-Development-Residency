import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

/**
 * Landing-page hero (section 1 of 7).
 *
 * Copy is drawn from the locked positioning statement (Week 2 Market Research, Notion) and
 * limited to what Release 1b actually ships — e.g. no Justice Layer claim (MMP), no
 * "every output is human-reviewed" (only flagged runs go to a person), no funder-export
 * claim until the responsible-AI summary export exists.
 *
 * The trust promises are a real list so screen readers announce them as a set; the check
 * icon is decorative (aria-hidden) and the meaning lives in the text, never in color alone.
 */

const PROMISES = [
  'Free safety net, always',
  'Decisions about people go to a person',
  'Not legal advice',
] as const;

function CheckIcon() {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      sx={{ width: 20, height: 20, flexShrink: 0, color: 'success.main' }}
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
      sx={{ py: { xs: 8, md: 14 }, bgcolor: 'background.default' }}
    >
      <Container maxWidth="md">
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
          sx={{ fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' }, lineHeight: 1.15, mt: 1 }}
        >
          AI that does your nonprofit&rsquo;s work — and keeps it safe.
        </Typography>

        <Typography
          variant="h6"
          component="p"
          sx={{ color: 'text.secondary', fontWeight: 400, mt: 3, maxWidth: '40rem' }}
        >
          Set your AI rules in about five minutes. Then your team drafts real work — thank-you
          notes, updates, summaries — with personal data stripped out, your rules checked, risky
          tasks sent to a person, and every result clearly labeled.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 5 }}>
          <Button component={NextLink} href="/signup" variant="contained" size="large">
            Get started free
          </Button>
          <Button component={NextLink} href="/login" variant="outlined" size="large">
            Log in
          </Button>
        </Box>

        <Box
          component="ul"
          aria-label="Our promises"
          sx={{
            listStyle: 'none',
            p: 0,
            m: 0,
            mt: 5,
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
      </Container>
    </Box>
  );
}
