import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import NextLink from 'next/link';
import { countOrgRuns } from '@/lib/data/usage';

/**
 * Usage (Registry view, Chunk 3 — Lane B). Presentation layer (ADR-0003): renders inside the
 * shared app shell (app/(app)/layout.tsx), which guards the session and provides the <main>
 * landmark + navigation. No governance logic here; the only data access is the read-only
 * count accessor in lib/data/usage.ts (Leak Test holds — no Supabase/SDK import in the UI).
 *
 * STEP 0 — walking skeleton. Proves the layer path end to end: route -> read query -> the three
 * distinct states (error / empty / has-activity). The real totals (by type / time / safety-net)
 * and the reusable empty-state component land in the next steps.
 */
export default async function UsagePage() {
  const runCount = await countOrgRuns();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1">
          Usage
        </Typography>
        <Typography variant="body1" color="text.secondary">
          A plain-language record of your organization&apos;s governed AI activity.
        </Typography>
      </Box>

      {runCount === null ? (
        <UsageErrorState />
      ) : runCount === 0 ? (
        <UsageEmptyState />
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body1">
            {runCount} governed {runCount === 1 ? 'run' : 'runs'} recorded.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Totals by task type, time, and safety outcome are coming next.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

/**
 * Zero-activity state. STEP 0 keeps this inline; it is extracted into a reusable component in
 * the empty-state step (so "my entries" can reuse it with user-scoped copy).
 */
function UsageEmptyState() {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h6" component="h2">
        No activity yet
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Once you run a governed task, this page will show how much AI was used, of what kind, over
        time, and how the safety net acted — in plain language, as counts, never the content of any
        task.
      </Typography>
      <Box>
        <Button variant="contained" component={NextLink} href="/skills">
          Run your first task
        </Button>
      </Box>
    </Paper>
  );
}

/** Error state — distinct from the empty state, so a failure never looks like "no activity". */
function UsageErrorState() {
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
