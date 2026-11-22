import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

/**
 * Landing-page "The safety net" (section 3 of 7) — a 2×2 feature grid, each card led by a decorative
 * icon slot.
 *
 * Every point maps to a mechanism Release 1b actually ships (PII strip before the model, the
 * deterministic rule-check, risky-use → human approval, provenance + the append-only record). No
 * overclaiming: it is NOT "every output is human-reviewed" (only flagged runs go to a person), and
 * there is no Justice Layer (MMP). Presentation only — no data access, so the Leak Test holds.
 *
 * Accessibility: the grid is a real <ul> with <h3> card titles (nested under the section <h2>, under
 * the hero <h1>); each icon is aria-hidden and the meaning lives in the text, never the icon alone.
 */

type IconName = 'shield' | 'check' | 'person' | 'record';

const ICON_PATHS: Record<IconName, string> = {
  // decorative only (aria-hidden) — a shield, a check, a person, and a document
  shield: 'M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  person: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z',
  record:
    'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5ZM8 13h8v1.5H8V13Zm0 3h8v1.5H8V16Z',
};

function FeatureIcon({ name }: { name: IconName }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        flexShrink: 0,
        width: 44,
        height: 44,
        borderRadius: 2,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box component="svg" viewBox="0 0 24 24" sx={{ width: 24, height: 24 }}>
        <path fill="currentColor" d={ICON_PATHS[name]} />
      </Box>
    </Box>
  );
}

const ITEMS: readonly { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'shield',
    title: 'Personal details are stripped first',
    body: 'Names, emails, phone numbers and other personal information are removed before anything reaches the AI — and you can deliberately keep something when a task truly needs it, with that choice recorded.',
  },
  {
    icon: 'check',
    title: 'Every draft is checked against your rules',
    body: "Your organization's policy is applied to each run, so what comes back follows the rules you set — automatically, with no one wiring it up.",
  },
  {
    icon: 'person',
    title: 'Risky tasks go to a person',
    body: 'Anything high-stakes — like a decision about someone, or a health, legal, or safety matter — is flagged and waits for a person to approve it before it can be used.',
  },
  {
    icon: 'record',
    title: 'Everything is labeled and recorded',
    body: 'Each result is clearly marked AI-assisted, and every run is written to a plain-language record you can look back on.',
  },
] as const;

export function SafetyNet() {
  return (
    <Box
      component="section"
      aria-labelledby="safety-net-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default' }}
    >
      <Container maxWidth="lg">
        <Box sx={{ maxWidth: '40rem' }}>
          <Typography
            component="p"
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
          >
            The safety net
          </Typography>
          <Typography
            id="safety-net-heading"
            variant="h3"
            component="h2"
            sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mt: 1 }}
          >
            A safety net around every task
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{ color: 'text.secondary', fontWeight: 400, mt: 2 }}
          >
            Protection runs automatically on every AI task — even before you&rsquo;ve written a
            single rule.
          </Typography>
        </Box>

        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            p: 0,
            m: 0,
            mt: 5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: { xs: 2.5, md: 3 },
          }}
        >
          {ITEMS.map((item) => (
            <Paper
              component="li"
              key={item.title}
              variant="outlined"
              sx={{
                p: { xs: 3, md: 3.5 },
                borderRadius: 3,
                bgcolor: 'background.paper',
                display: 'flex',
                gap: 2.5,
                alignItems: 'flex-start',
              }}
            >
              <FeatureIcon name={item.icon} />
              <Box>
                <Typography variant="h6" component="h3">
                  {item.title}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {item.body}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
