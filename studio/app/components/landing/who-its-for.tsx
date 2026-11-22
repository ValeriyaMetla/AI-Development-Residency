import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

/**
 * Landing-page "Who it's for" (section 4 of 7) — a two-column split: the Accountable Leader panel
 * beside the Frontline Doer panel, with the "no expertise required" reassurance as a closing note.
 *
 * The two real product roles (Accountable Leader, Frontline Doer — role-aware throughout the app)
 * and the audience from the locked positioning (small, mission-driven orgs without an AI specialist).
 * No overclaiming. Presentation only — no data access, so the Leak Test holds.
 *
 * Accessibility: the two roles are a real <ul> with <h3> panel titles; the closing note is plain
 * prose. Headings nest h2 (section) → h3 (each role) under the hero's h1.
 */

const ROLES = [
  {
    label: 'For the person in charge',
    title: 'The person in charge',
    body: "Set your organization's AI rules in minutes and stay in control — you have the final say, and your rules apply to everyone's AI use automatically.",
  },
  {
    label: 'For the team',
    title: 'The people doing the work',
    body: 'Get safe AI help for everyday tasks — thank-yous, updates, summaries — with the guardrails built in, so you can use AI in the open instead of quietly carrying the risk.',
  },
] as const;

const NO_EXPERTISE = {
  title: 'No AI expertise required',
  body: "You don't need to know AI policy or compliance. Recognized standards are built in, and the guidance is in plain language.",
} as const;

export function WhoItsFor() {
  return (
    <Box
      component="section"
      aria-labelledby="who-its-for-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}
    >
      <Container maxWidth="lg">
        <Box sx={{ maxWidth: '40rem' }}>
          <Typography
            component="p"
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
          >
            Who it&rsquo;s for
          </Typography>
          <Typography
            id="who-its-for-heading"
            variant="h3"
            component="h2"
            sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mt: 1 }}
          >
            Made for mission-driven teams, not AI experts
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{ color: 'text.secondary', fontWeight: 400, mt: 2 }}
          >
            Built for small nonprofits and community organizations that want to use AI responsibly —
            without hiring a specialist.
          </Typography>
        </Box>

        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            p: 0,
            m: 0,
            mt: 5,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          {ROLES.map((role) => (
            <Paper
              component="li"
              key={role.title}
              variant="outlined"
              sx={{
                flex: '1 1 0',
                minWidth: 0,
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                bgcolor: 'background.default',
              }}
            >
              <Typography
                component="p"
                variant="overline"
                sx={{ color: 'primary.main', fontWeight: 700 }}
              >
                {role.label}
              </Typography>
              <Typography variant="h6" component="h3" sx={{ mt: 0.5 }}>
                {role.title}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                {role.body}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Paper
          variant="outlined"
          sx={{
            mt: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            bgcolor: 'background.default',
            textAlign: { xs: 'left', sm: 'center' },
          }}
        >
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
            {NO_EXPERTISE.title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {NO_EXPERTISE.body}
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
