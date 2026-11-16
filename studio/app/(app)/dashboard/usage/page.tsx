import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { countOrgRuns } from '@/lib/data/usage';
import { usageViewState } from '@/lib/domain/usage';
import { UsageEmptyState, UsageErrorState } from './usage-states';

/**
 * Usage (Registry view, Chunk 3 — Lane B). Presentation layer (ADR-0003): renders inside the
 * shared app shell (app/(app)/layout.tsx), which guards the session and provides the <main>
 * landmark + navigation. The only data access is the read-only count accessor in
 * lib/data/usage.ts; the error/empty/active decision is the pure usageViewState() helper in the
 * Domain layer (Leak Test holds — no Supabase/SDK import in the UI).
 *
 * STEP 1 — the reusable empty/error states are now their own components; the real totals
 * (by type / time / safety-net) land in the next step and replace the placeholder below.
 */
export default async function UsagePage() {
  const runCount = await countOrgRuns();
  const state = usageViewState(runCount);

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

      {state === 'error' ? (
        <UsageErrorState />
      ) : state === 'empty' ? (
        <UsageEmptyState />
      ) : (
        <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
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
