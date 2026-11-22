import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

/**
 * Landing-page "Standards" (section 5 of 7) — a compact, centered trust band: the three frameworks as
 * labeled cards in a row.
 *
 * The three frameworks the standards library is actually seeded from (ADR-0008) and that the policy
 * rules + Co-Pilot cite by code. The "every rule cites its source" claim is real (snapshotted
 * citations on each policy rule). Presentation only — no data access, so the Leak Test holds.
 *
 * Accessibility: the frameworks are a real <ul> with <h3> names; the band is centered but the markup
 * stays a list so a screen reader announces three items. Headings nest h2 → h3 under the hero's h1.
 */

const ITEMS = [
  {
    name: 'NIST AI RMF',
    full: 'NIST AI Risk Management Framework',
    body: 'The U.S. framework for identifying and managing the risks of AI responsibly.',
  },
  {
    name: 'EU AI Act',
    full: 'EU AI Act',
    body: "The European Union's risk-based rules for how AI systems may be used.",
  },
  {
    name: 'ISO/IEC 42001',
    full: 'ISO/IEC 42001',
    body: 'The international standard for managing AI within an organization.',
  },
] as const;

export function Standards() {
  return (
    <Box
      component="section"
      aria-labelledby="standards-heading"
      sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default' }}
    >
      <Container maxWidth="md" sx={{ textAlign: 'center' }}>
        <Typography
          component="p"
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
        >
          Grounded in standards
        </Typography>
        <Typography
          id="standards-heading"
          variant="h3"
          component="h2"
          sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, mt: 1 }}
        >
          Your rules, grounded in recognized standards
        </Typography>
        <Typography
          variant="h6"
          component="p"
          sx={{ color: 'text.secondary', fontWeight: 400, mt: 2, mx: 'auto', maxWidth: '42rem' }}
        >
          This isn&rsquo;t our opinion of what&rsquo;s safe. Your policy is built from the
          frameworks funders and regulators recognize — and every rule shows the standard it comes
          from.
        </Typography>

        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            p: 0,
            m: 0,
            mt: 5,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: { xs: 2, md: 3 },
          }}
        >
          {ITEMS.map((item) => (
            <Paper
              component="li"
              key={item.name}
              variant="outlined"
              sx={{
                flex: '1 1 220px',
                maxWidth: 320,
                p: 3,
                borderRadius: 3,
                bgcolor: 'background.paper',
              }}
            >
              <Typography component="h3" variant="h6" sx={{ fontSize: '1.125rem' }}>
                {item.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {item.body}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
