import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import NextLink from 'next/link';
import type { GovernedAISummary, SummaryStat } from '@/lib/domain/report-summary';
import { PrintButton } from './print-button';

/**
 * The Governed AI Summary at the top of `/report` (cards "Build one-click responsible-AI summary
 * export" US1/US4 + "Handle low-data honestly in the summary"). Presentation only (ADR-0003): every
 * sentence comes from the pure, templated `composeSummary` — this file only lays it out and formats
 * dates. Counts and facts only, never run content.
 *
 * Accessibility: a real `h2` section, figures as a list, the early-use caveat as plain text sitting
 * with the figures it qualifies (never color or emphasis alone).
 */
export function GovernedSummary({
  summary,
  canExport,
}: {
  summary: GovernedAISummary;
  /** False when any part of the page failed to load — the export is then hidden (US4). */
  canExport: boolean;
}) {
  return (
    <Paper
      component="section"
      aria-labelledby="governed-summary-heading"
      variant="outlined"
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        '@media print': { border: 'none', p: 0 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h5" component="h2" id="governed-summary-heading">
            Governed AI Summary
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary.orgName} · Generated{' '}
            <time dateTime={summary.generatedAt}>{formatDate(summary.generatedAt)}</time>
          </Typography>
        </Box>
        {canExport ? <PrintButton /> : null}
      </Box>

      <Box>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {summary.headline}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {summary.sampleSize}
        </Typography>
        {summary.caveat ? (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {summary.caveat}
          </Typography>
        ) : null}
      </Box>

      {summary.state === 'empty' ? (
        // US2 (low-data card) — say so plainly and offer the next step; never an all-zero table.
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', displayPrint: 'none' }}>
          <Button variant="outlined" component={NextLink} href="/skills">
            Run a Skill
          </Button>
        </Box>
      ) : (
        <Box>
          <Typography variant="subtitle2" component="h3">
            How oversight acted
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {summary.stats.map((stat) => (
              <Typography component="li" variant="body2" key={stat.label}>
                {statText(stat)}
              </Typography>
            ))}
            {summary.humanReviewed ? (
              <Typography component="li" variant="body2">
                {statText(summary.humanReviewed)}
              </Typography>
            ) : null}
          </Box>
        </Box>
      )}

      <Box>
        <Typography variant="subtitle2" component="h3">
          Policy in force
        </Typography>
        <Typography variant="body2">
          {summary.policy
            ? `${summary.policy.name} (in force since ${formatDate(summary.policy.activeSince)})`
            : 'No active policy — baseline safety only'}
        </Typography>
      </Box>

      {/* The statement opens with its own "How this record is protected:" label. */}
      <Typography variant="body2">{summary.protection}</Typography>
    </Paper>
  );
}

/** A raw count, plus a percentage only when the composer supplied one (above the floor). */
function statText(stat: SummaryStat): string {
  const pct = stat.percent === null ? '' : ` (${stat.percent}%)`;
  return `${stat.label}: ${stat.count}${pct}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
}
