import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { listPendingReviews, type PendingReview } from '@/lib/data/runs';
import type { CopilotReview } from '@/lib/domain/copilot-review';
import { waitingAge } from '@/lib/domain/review-waiting';
import ReviewActions from './review-actions';

/**
 * Approvals queue (Presentation layer, ADR-0003 / ADR-0020). The consumer for the runs the spine
 * routes to 'needs_review': it lists what's waiting and lets any org member approve or reject, with
 * enough context to decide (the draft + why it flagged). Data access is confined to the read-only
 * accessor in lib/data/runs.ts; the decision write goes through the Service action (Leak Test holds
 * — no Supabase/SDK import here). The session guard, <main> landmark, and nav come from the shell.
 */
export default async function ApprovalsPage() {
  const pending = await listPendingReviews();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Human Review
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Work the safety net flagged for a person to decide, oldest first. Read what was flagged
          and why, then decide — your decision is recorded.
        </Typography>
      </Box>

      {pending === null ? (
        <Alert severity="error">
          We couldn&apos;t load the review queue just now. Please refresh in a moment.
        </Alert>
      ) : pending.length === 0 ? (
        <EmptyQueue />
      ) : (
        <Box
          component="ul"
          sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          {pending.map((item) => (
            <Box component="li" key={item.taskRunId}>
              <PendingRunCard item={item} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

/** Nothing flagged — a calm, clear state, distinct from an error. */
function EmptyQueue() {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6" component="h2">
        Nothing needs review
      </Typography>
      <Typography variant="body2" color="text.secondary">
        When a run is flagged by the safety net, it shows up here for a person to approve or reject.
        You can run a task from{' '}
        <Link component={NextLink} href="/skills">
          Skills
        </Link>
        .
      </Typography>
    </Paper>
  );
}

/** One pending run: what it is, why it flagged, the draft, and the approve/reject controls. */
function PendingRunCard({ item }: { item: PendingReview }) {
  if ('copilot' in item) return <CopilotAdviceCard item={item} review={item.copilot ?? null} />;
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" component="h2">
          {item.skillName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {waitingAge(item.createdAt, new Date())}
          </Box>{' '}
          · {new Date(item.createdAt).toLocaleString()}
        </Typography>
      </Box>

      {item.flags.length > 0 ? (
        <Alert severity="warning" role="status">
          <Typography variant="subtitle2" component="p">
            Why this needs review
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {item.flags.map((flag, i) => (
              <li key={i}>{flag.reason}</li>
            ))}
          </Box>
        </Alert>
      ) : null}

      {item.inputSummary ? (
        <Box>
          <Typography variant="overline" color="text.secondary">
            The request
          </Typography>
          <Typography variant="body2">{item.inputSummary}</Typography>
        </Box>
      ) : null}

      <Box>
        <Typography variant="overline" color="text.secondary">
          The draft
        </Typography>
        <Typography
          variant="body1"
          component="p"
          sx={{ whiteSpace: 'pre-wrap', bgcolor: 'background.default', p: 2, borderRadius: 1 }}
        >
          {item.output ?? '(No draft was produced.)'}
        </Typography>
        {item.provenanceLabel ? (
          <Typography variant="caption" color="text.secondary">
            {item.provenanceLabel}
          </Typography>
        ) : null}
      </Box>

      <Divider />
      <ReviewActions taskRunId={item.taskRunId} output={item.output ?? ''} />
    </Paper>
  );
}

/**
 * A flagged Co-Pilot assessment (card "Show reviewers why a Co-Pilot assessment was flagged"): what
 * was asked, the advice, why, and how to make it safer — no draft, because the Co-Pilot gives
 * advice, not a draft. A "Don't use AI for this" verdict is never approvable (Val, 2026-11-23), and
 * advice whose reasons can't be loaded can't be approved here either: you can't approve what you
 * can't see. Meaning is in words, never color alone.
 */
function CopilotAdviceCard({
  item,
  review,
}: {
  item: PendingReview;
  review: CopilotReview | null;
}) {
  const blockedReason = !review
    ? "We couldn't load the Co-Pilot's reasons, so this can't be approved here. Choose \"Don't go ahead\", or ask the person who asked."
    : !review.approvable
      ? "The Co-Pilot advises against this use, so it can't be approved. Record your decision below."
      : undefined;

  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" component="h2">
          {item.skillName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {waitingAge(item.createdAt, new Date())}
          </Box>{' '}
          · {new Date(item.createdAt).toLocaleString()}
        </Typography>
      </Box>

      {item.inputSummary ? (
        <Box>
          <Typography variant="overline" color="text.secondary" component="h3">
            What was asked
          </Typography>
          <Typography variant="body2">{item.inputSummary}</Typography>
        </Box>
      ) : null}

      {review ? (
        <>
          <Box>
            <Typography variant="overline" color="text.secondary" component="h3">
              The Co-Pilot&apos;s advice
            </Typography>
            <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700 }}>
              {review.verdictTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Risk level: {review.riskLabel}
            </Typography>
            {review.explanation ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">{review.explanation}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Written by AI. The advice itself comes from fixed rules, not the AI.
                </Typography>
              </Box>
            ) : null}
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary" component="h3">
              Why
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 1 }}>
              {review.reasons.map((r) => (
                <li key={r.text}>
                  <Typography variant="body2">{r.text}</Typography>
                  {r.sources.length > 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Source: {r.sources.join('; ')}
                    </Typography>
                  ) : null}
                </li>
              ))}
            </Box>
          </Box>

          {review.saferWay ? (
            <Box>
              <Typography variant="overline" color="text.secondary" component="h3">
                {review.saferWay.noSafePath
                  ? 'There is no safe way to do this'
                  : 'To make it safer'}
              </Typography>
              {review.saferWay.steps.length > 0 ? (
                <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.5 }}>
                  {review.saferWay.steps.map((step) => (
                    <Typography component="li" variant="body2" key={step}>
                      {step}
                    </Typography>
                  ))}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </>
      ) : (
        <Alert severity="warning" role="note">
          The Co-Pilot&apos;s reasons for this assessment couldn&apos;t be loaded.
        </Alert>
      )}

      <Divider />
      <ReviewActions
        taskRunId={item.taskRunId}
        output=""
        kind="advice"
        canApprove={Boolean(review?.approvable)}
        blockedReason={blockedReason}
      />
    </Paper>
  );
}
