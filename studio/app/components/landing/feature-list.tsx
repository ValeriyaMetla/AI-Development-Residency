import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Shared landing-page bits: a decorative check icon and a titled feature list, used by the
 * safety-net / who-it's-for / standards / free-safety-net sections so they read as one system.
 *
 * Accessibility: the list is a real <ul> with <h3> item titles (nested under each section's <h2>,
 * under the hero's <h1>); the check is aria-hidden and the meaning lives in the text, never in the
 * icon or color alone. Presentation only.
 */

export function CheckIcon() {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      sx={{ width: 22, height: 22, flexShrink: 0, color: 'success.main', mt: 0.25 }}
    >
      <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
    </Box>
  );
}

export type Feature = { title: string; body: string };

export function FeatureList({ items }: { items: readonly Feature[] }) {
  return (
    <Box
      component="ul"
      sx={{
        listStyle: 'none',
        p: 0,
        m: 0,
        mt: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {items.map((item) => (
        <Box
          component="li"
          key={item.title}
          sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'flex-start' }}
        >
          <CheckIcon />
          <Box>
            <Typography variant="h6" component="h3">
              {item.title}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {item.body}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
