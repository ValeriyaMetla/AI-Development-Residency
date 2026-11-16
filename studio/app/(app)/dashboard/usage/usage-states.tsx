import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import NextLink from 'next/link';

/**
 * Reusable empty / error states for the Registry view (Chunk 3, Presentation layer, ADR-0003).
 *
 * Kept as their own components so the org-wide usage dashboard and the per-user "my entries" view
 * share one treatment with their own copy, and so a load failure never looks like "no activity".
 * Presentation-only — no data access here (the page passes the already-resolved state in).
 */

export type EmptyStateCta = { label: string; href: string };

/**
 * Zero-activity state. Defaults speak for the org-wide usage view; "my entries" overrides the copy
 * (and may pass `cta={null}` where a call-to-action is not wanted).
 */
export function UsageEmptyState({
  title = 'No activity yet',
  description = 'Once you run a governed task, this page will show how much AI was used, of what kind, over time, and how the safety net acted — in plain language, as counts, never the content of any task.',
  cta = { label: 'Run your first task', href: '/skills' },
}: {
  title?: string;
  description?: string;
  cta?: EmptyStateCta | null;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {cta ? (
        <Box>
          <Button variant="contained" component={NextLink} href={cta.href}>
            {cta.label}
          </Button>
        </Box>
      ) : null}
    </Paper>
  );
}

/** Error state — visibly distinct from the empty state, so a failure never reads as "no activity". */
export function UsageErrorState() {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6" component="h2">
        We couldn&apos;t load your usage right now
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Please try again in a moment. If it keeps happening, let your administrator know.
      </Typography>
    </Paper>
  );
}
