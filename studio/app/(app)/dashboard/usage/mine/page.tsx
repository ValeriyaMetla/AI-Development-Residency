import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import NextLink from 'next/link';
import { getMyRunEntries } from '@/lib/data/usage';
import { getMyCorrections } from '@/lib/data/corrections';
import { outcomeLabel } from '@/lib/domain/usage';
import { correctionsByRun } from '@/lib/domain/corrections';
import { UsageEmptyState, UsageErrorState } from '../usage-states';
import CorrectionActions from './correction-actions';

/**
 * My entries (Registry view, Chunk 3 — Lane B). The per-user transparency view: a person sees
 * their OWN logged runs. Presentation layer (ADR-0003) inside the shared shell. Data access is the
 * read-only getMyRunEntries() (filtered run_by = me); no content, counts/metadata only.
 *
 * Transparency toward the data subject (responsible-AI): this is the person's own record, visible
 * to them and to their org's Leader — accountability, not covert surveillance.
 *
 * STEP 4 (ADR-0021) — each row carries an entry-correction / note action: a person can annotate
 * their OWN run (additive, never an edit). Corrections are fetched once and grouped by run; a query
 * error on them degrades gracefully (the list still renders) rather than failing the whole page.
 */
export default async function MyEntriesPage() {
  const entries = await getMyRunEntries();
  const corrections = await getMyCorrections();
  const byRun = correctionsByRun(corrections ?? []);

  let body: ReactNode;
  if (entries === null) {
    body = <UsageErrorState />;
  } else if (entries.length === 0) {
    body = (
      <UsageEmptyState
        title="You haven't run any tasks yet"
        description="When you run a governed task, your own record of it will show here — the task type, when you ran it, and how it was handled. Only you and your organization's leader can see it."
      />
    );
  } else {
    body = (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Table size="small" aria-label="Your runs">
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">
                Task type
              </TableCell>
              <TableCell component="th" scope="col">
                When
              </TableCell>
              <TableCell component="th" scope="col">
                How it was handled
              </TableCell>
              <TableCell component="th" scope="col">
                Your notes
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell component="th" scope="row">
                  {e.skillName}
                </TableCell>
                <TableCell>{formatWhen(e.createdAt)}</TableCell>
                <TableCell>{outcomeLabel(e.status)}</TableCell>
                <TableCell>
                  <CorrectionActions
                    runId={e.id}
                    skillName={e.skillName}
                    corrections={byRun.get(e.id) ?? []}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1">
          My entries
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your own record of the AI tasks you&apos;ve run — visible to you and your
          organization&apos;s leader. This is transparency, not surveillance: only what&apos;s
          listed here is recorded, and never the content of a task.
        </Typography>
      </Box>

      {body}

      <Box>
        <Button variant="text" component={NextLink} href="/dashboard/usage">
          View organization usage
        </Button>
      </Box>
    </Box>
  );
}

/** Render a timestamp as a short, readable date. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
