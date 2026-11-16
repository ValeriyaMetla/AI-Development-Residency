import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import type { TypeTotal, WeekBucket, SafetyNetSummary } from '@/lib/domain/usage';

/**
 * Usage dashboard sections (Registry view, Chunk 3, Presentation layer, ADR-0003).
 *
 * Presentation-only: it renders already-aggregated counts passed in by the page. No data access,
 * no governance logic. Counts and labels only — never any run content. Each section is a real
 * data table (caption + scoped column/row headers) so it is legible to a screen reader, and
 * outcomes are conveyed by text, not color alone.
 */
export function UsageDashboard({
  windowLabel,
  total,
  typeTotals,
  weekBuckets,
  safety,
}: {
  windowLabel: string;
  total: number;
  typeTotals: TypeTotal[];
  weekBuckets: WeekBucket[];
  safety: SafetyNetSummary;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="body1">
          <strong>{total}</strong> governed {total === 1 ? 'run' : 'runs'} in {windowLabel}.
        </Typography>
      </Paper>

      <Section title="By task type">
        <Table size="small" aria-label="Runs by task type">
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">
                Task type
              </TableCell>
              <TableCell component="th" scope="col" align="right">
                Runs
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {typeTotals.map((t) => (
              <TableRow key={t.name}>
                <TableCell component="th" scope="row">
                  {t.name}
                </TableCell>
                <TableCell align="right">{t.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Over time">
        <Table size="small" aria-label="Runs by week">
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">
                Week
              </TableCell>
              <TableCell component="th" scope="col" align="right">
                Runs
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weekBuckets.map((w) => (
              <TableRow key={w.startIso}>
                <TableCell component="th" scope="row">
                  {w.label}
                </TableCell>
                <TableCell align="right">{w.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title="Safety net"
        subtitle="How the guardrails handled these runs — every run is checked before you use it."
      >
        <Table size="small" aria-label="Runs by safety outcome">
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">
                Outcome
              </TableCell>
              <TableCell component="th" scope="col" align="right">
                Runs
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <OutcomeRow label="Completed cleanly" count={safety.cleared} />
            <OutcomeRow label="Needed review" count={safety.needsReview} />
            <OutcomeRow label="Blocked by a rule" count={safety.blocked} />
            <OutcomeRow label="Rejected on review" count={safety.rejected} />
            {safety.inProgress > 0 ? (
              <OutcomeRow label="In progress" count={safety.inProgress} />
            ) : null}
          </TableBody>
        </Table>
      </Section>
    </Box>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Paper>
  );
}

function OutcomeRow({ label, count }: { label: string; count: number }) {
  return (
    <TableRow>
      <TableCell component="th" scope="row">
        {label}
      </TableCell>
      <TableCell align="right">{count}</TableCell>
    </TableRow>
  );
}
