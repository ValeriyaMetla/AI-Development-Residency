import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { getMyProfile } from '@/lib/data/profile';
import {
  getAuditTrail,
  getSummaryInputs,
  TRAIL_PAGE_SIZE,
  type TrailEntry,
  type TrailPage,
  type TrailRunContext,
} from '@/lib/data/report';
import { actorLabel, eventWording, RUN_GAP_MARKER } from '@/lib/domain/report';
import { AUDIT_PROTECTION_STATEMENT } from '@/lib/domain/audit-events';
import { allTimePeriodLabel, composeSummary } from '@/lib/domain/report-summary';
import { GovernedSummary } from './governed-summary';

/**
 * Audit trail (`/report`) — Presentation layer (ADR-0003), card "Build the audit trail from registry
 * data" (Epic #7, Lane C). Renders inside the shared app shell (`app/(app)/layout.tsx`), which guards
 * the session and provides the <main> landmark + nav.
 *
 * Leader-only (US3): the role is checked here, on the server, before any record is read — a Doer or a
 * signed-out visitor never has the org's records sent to their browser. All data comes from the
 * read-only `lib/data/report.ts`; all wording/gap logic is the pure Domain layer. The Leak Test holds
 * (no Supabase/SDK, no business logic in this file). Counts/facts only — never run content.
 *
 * Above the trail sits the Governed AI Summary (card "Build one-click responsible-AI summary
 * export"): templated by the pure `composeSummary` from `getSummaryInputs`, and exported with the
 * browser's own Print / Save as PDF. Summary and trail each own their error / empty states — they
 * count different things (governed runs vs audit events), so one can be empty while the other isn't.
 */

function PageShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1">
          Audit Trail
        </Typography>
        <Typography variant="body1" color="text.secondary">
          A complete, time-stamped record of your organization&apos;s governed AI activity — what
          happened, who did it, and when. Facts about actions only, never the content of any task.
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  // US3 — Leader-only, enforced on the server, before any record is read. A Doer gets a way
  // forward, not the org's records (applies to the summary and the export too).
  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return (
      <PageShell>
        <Alert severity="info">
          The audit trail is for Accountable Leaders. You can see your own activity on{' '}
          <Link component={NextLink} href="/dashboard/usage/mine">
            My entries
          </Link>
          .
        </Alert>
      </PageShell>
    );
  }

  const { show } = await searchParams;
  const requested = Number.parseInt(show ?? '', 10);
  const limit = Number.isFinite(requested) && requested > 0 ? requested : TRAIL_PAGE_SIZE;

  const [trail, inputs] = await Promise.all([getAuditTrail(limit), getSummaryInputs()]);

  // Export card US4 — the export is offered only when everything it would print loaded. A printout
  // with a "couldn't load" gap must never pass as a complete report.
  const canExport = trail !== null && inputs !== null;

  return (
    <PageShell>
      {inputs === null ? (
        // A load failure must never read as "no activity" — and never prints as a summary.
        <StateCard
          title="We couldn't load your summary"
          body="Please try again in a moment. If it keeps happening, let your administrator know."
          cta={{ label: 'Try again', href: '/report' }}
        />
      ) : (
        <GovernedSummary
          canExport={canExport}
          summary={composeSummary({
            orgName: profile.org?.name ?? null,
            generatedAt: new Date().toISOString(),
            periodLabel: allTimePeriodLabel(inputs.firstActivityAt),
            ...inputs,
          })}
        />
      )}

      <TrailSection trail={trail} />
    </PageShell>
  );
}

/** The event-by-event record below the summary, with its own error / empty states (trail US4). */
function TrailSection({ trail }: { trail: TrailPage | null }) {
  if (trail === null) {
    return (
      <StateCard
        title="We couldn't load your audit trail"
        body="Please try again in a moment. If it keeps happening, let your administrator know."
        cta={{ label: 'Try again', href: '/report' }}
      />
    );
  }

  // First-run empty state (distinct from the error state above).
  if (trail.total === 0) {
    return (
      <StateCard
        title="No governed activity yet"
        body="Once your team runs a governed task or you set up your AI policy, every action will appear here in time order. Nothing is recorded until then."
        cta={{ label: 'Run a Skill', href: '/skills' }}
        secondaryCta={{ label: 'Set up your policy', href: '/policy-seed' }}
      />
    );
  }

  const gapped = new Set(trail.gappedRunIds);
  const shown = trail.entries.length;
  const hasMore = shown < trail.total;

  return (
    <Box
      component="section"
      aria-labelledby="trail-heading"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="h5" component="h2" id="trail-heading">
        Activity record
      </Typography>

      {/* The summary already carries the protection statement in print; on screen it stays here. */}
      <Alert severity="info" sx={{ '& a': { color: 'inherit' }, displayPrint: 'none' }}>
        {AUDIT_PROTECTION_STATEMENT}
      </Alert>

      <Typography variant="body2" color="text.secondary">
        Showing {shown} of {trail.total} {trail.total === 1 ? 'entry' : 'entries'}, newest first.
      </Typography>

      <Box
        component="ol"
        aria-label="Governed AI activity, newest first"
        sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        {trail.entries.map((entry) => (
          <TrailRow
            key={entry.id}
            entry={entry}
            gapped={entry.taskRunId != null && gapped.has(entry.taskRunId)}
          />
        ))}
      </Box>

      {hasMore ? (
        <Box sx={{ displayPrint: 'none' }}>
          <Button
            variant="outlined"
            component={NextLink}
            href={`/report?show=${shown + TRAIL_PAGE_SIZE}`}
          >
            Show older entries
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}

/** One entry: when + who, the plain-language line, run context, and a gap marker when applicable. */
function TrailRow({ entry, gapped }: { entry: TrailEntry; gapped: boolean }) {
  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, breakInside: 'avoid' }}
    >
      <Typography variant="body2" color="text.secondary">
        <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
        {' · '}
        {actorLabel(entry.actor)}
      </Typography>
      <Typography variant="body1">{eventWording(entry)}</Typography>
      {entry.run ? <RunContextLine run={entry.run} /> : null}
      {gapped ? (
        // Meaning is carried by the icon + words, never color alone (WCAG 2.2 AA).
        <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 500 }}>
          <span aria-hidden="true">⚠ </span>
          {RUN_GAP_MARKER}
        </Typography>
      ) : null}
    </Paper>
  );
}

/** US1 — a run entry also shows the Skill and the policy version that applied. */
function RunContextLine({ run }: { run: TrailRunContext }) {
  const policy = run.policy
    ? `Policy: ${run.policy.name} (took effect ${formatDate(run.policy.effectiveAt)})`
    : 'No active policy — baseline safety only';
  return (
    <Typography variant="body2" color="text.secondary">
      {run.skillName ?? 'A task'} · {policy}
    </Typography>
  );
}

/** Empty / error treatment matching the usage dashboard's pattern (card quality bar). */
function StateCard({
  title,
  body,
  cta,
  secondaryCta,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
      {cta || secondaryCta ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', displayPrint: 'none' }}>
          {cta ? (
            <Button variant="contained" component={NextLink} href={cta.href}>
              {cta.label}
            </Button>
          ) : null}
          {secondaryCta ? (
            <Button variant="outlined" component={NextLink} href={secondaryCta.href}>
              {secondaryCta.label}
            </Button>
          ) : null}
        </Box>
      ) : null}
    </Paper>
  );
}

/** Readable UTC date+time; the <time> element carries the exact ISO value for assistive tech. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(d)} UTC`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
}
