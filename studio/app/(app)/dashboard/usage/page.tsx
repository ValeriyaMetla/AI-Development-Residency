import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { countOrgRuns, getRunSummariesSince } from '@/lib/data/usage';
import {
  usageViewState,
  windowStart,
  totalsByType,
  bucketByWeek,
  safetyNetSummary,
} from '@/lib/domain/usage';
import { UsageEmptyState, UsageErrorState } from './usage-states';
import { UsageDashboard } from './usage-dashboard';

/**
 * Usage (Registry view, Chunk 3 — Lane B). Presentation layer (ADR-0003): renders inside the
 * shared app shell (app/(app)/layout.tsx), which guards the session and provides the <main>
 * landmark + navigation. Data access is confined to the read-only accessors in lib/data/usage.ts;
 * all shaping is the pure Domain helpers in lib/domain/usage.ts (Leak Test holds — no Supabase/SDK
 * import in the UI).
 *
 * STEP 2 — real totals: by task type, over time (rolling weekly buckets), and the safety-net
 * summary. By-staff is deferred (blocked on an org-scoped profile read — Lane A). Counts only,
 * never run content.
 */
const WEEKS = 5;

export default async function UsagePage() {
  const allTimeCount = await countOrgRuns();
  const state = usageViewState(allTimeCount);

  let body: ReactNode;
  if (state === 'error') {
    body = <UsageErrorState />;
  } else if (state === 'empty') {
    body = <UsageEmptyState />;
  } else {
    const now = new Date();
    const runs = await getRunSummariesSince(windowStart(now, WEEKS).toISOString());
    if (runs === null) {
      body = <UsageErrorState />;
    } else if (runs.length === 0) {
      body = <NoRecentActivity />;
    } else {
      body = (
        <UsageDashboard
          windowLabel="the last 5 weeks"
          total={runs.length}
          typeTotals={totalsByType(runs)}
          weekBuckets={bucketByWeek(runs, now, WEEKS)}
          safety={safetyNetSummary(runs)}
        />
      );
    }
  }

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
      {body}
    </Box>
  );
}

/** The org has used AI before, but not inside the current window — distinct from the first-run empty state. */
function NoRecentActivity() {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6" component="h2">
        No activity in the last 5 weeks
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Your organization has used governed AI before, but not recently. New runs will show up here.
      </Typography>
    </Paper>
  );
}
