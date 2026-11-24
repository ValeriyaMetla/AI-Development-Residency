'use client';

import { useId, useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { submitReview } from './actions';
import { MAX_REVIEW_NOTE, MAX_EDITED_OUTPUT, type ReviewDecision } from '@/lib/domain/approvals';
import { composeProvenance } from '@/lib/domain/provenance';

/**
 * Approve / reject controls for one flagged run (Presentation layer, ADR-0003). Shared by the
 * /approvals queue and the inline review on the Skill runner result — both call the same Service
 * action (ADR-0020 / ADR-0022).
 *
 * No rubber stamp (card 2): approving is gated behind a deliberate acknowledgement; rejecting is
 * always immediately available. Editing (card 3, ADR-0022): the reviewer may edit the draft before
 * approving; an actual change is sent as `editedOutput` and the outcome shows the composed
 * provenance ("edited and approved by a person"). These are UX guards, not security controls — the
 * human-in-the-loop guarantee is the gate itself plus the recorded decision.
 *
 * Co-Pilot advice (card "Show reviewers why a Co-Pilot assessment was flagged"): `kind="advice"`
 * drops the draft editing and uses advice wording. When `canApprove` is false — a "Don't use AI for
 * this" verdict (never approvable, Val 2026-11-23) or advice whose reasons couldn't be loaded — the
 * only action is "Don't go ahead" (recorded as a rejection), and `blockedReason` says why.
 */
export type ReviewKind = 'draft' | 'advice';

export default function ReviewActions({
  taskRunId,
  output,
  kind = 'draft',
  canApprove = true,
  blockedReason,
}: {
  taskRunId: string;
  output: string;
  kind?: ReviewKind;
  canApprove?: boolean;
  blockedReason?: string;
}) {
  const helpId = useId();
  const isAdvice = kind === 'advice';
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(output);
  const [done, setDone] = useState<ReviewDecision | null>(null);
  const [doneEdited, setDoneEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the database says this run can no longer be reviewed here (ADR-0028) — e.g. someone
  // already decided it in another tab. The controls close instead of staying clickable.
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // An edit counts only if the reviewer turned editing on AND actually changed the text.
  const editedOutput =
    editing && draft.trim() && draft.trim() !== output.trim() ? draft : undefined;

  function decide(decision: ReviewDecision) {
    setError(null);
    const sendEdit = decision === 'approved' ? editedOutput : undefined;
    startTransition(async () => {
      const res = await submitReview({ taskRunId, decision, note, editedOutput: sendEdit });
      if (res.status === 'done') {
        setDone(res.decision);
        setDoneEdited(Boolean(sendEdit));
      } else if (res.status === 'blocked' && res.closed) {
        setClosedMessage(res.message);
      } else {
        setError(res.message);
      }
    });
  }

  if (closedMessage) {
    return (
      <Alert severity="info" role="status">
        {closedMessage} Refresh the page to see its current state.
      </Alert>
    );
  }

  if (done) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Alert severity={done === 'approved' ? 'success' : 'info'} role="status">
          {done === 'approved'
            ? 'Approved — your decision is recorded.'
            : isAdvice
              ? "Recorded: don't go ahead."
              : 'Rejected — your decision is recorded.'}
        </Alert>
        {done === 'approved' && !isAdvice ? (
          <Typography variant="caption" color="text.secondary">
            {composeProvenance({ approved: true, edited: doneEdited })}
          </Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {!isAdvice && editing ? (
        <TextField
          label="Your edited draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          multiline
          minRows={4}
          fullWidth
          slotProps={{ htmlInput: { maxLength: MAX_EDITED_OUTPUT } }}
        />
      ) : isAdvice ? null : (
        <Box>
          <Button variant="text" size="small" onClick={() => setEditing(true)}>
            Edit the draft before approving
          </Button>
        </Box>
      )}
      {!isAdvice && editing ? (
        <Box>
          <Button
            variant="text"
            size="small"
            color="inherit"
            onClick={() => {
              setEditing(false);
              setDraft(output);
            }}
          >
            Cancel edit (use the original)
          </Button>
        </Box>
      ) : null}

      <TextField
        label="Add a note (optional)"
        placeholder="Why you're approving or rejecting — a short reason, no sensitive details."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        multiline
        minRows={2}
        fullWidth
        slotProps={{ htmlInput: { maxLength: MAX_REVIEW_NOTE } }}
      />

      {error ? (
        <Alert severity="error" role="status">
          {error}
        </Alert>
      ) : null}

      {canApprove ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {isAdvice
              ? 'Approving records that a person decided this use may go ahead, with the conditions shown.'
              : `Approving means ${editedOutput ? 'your edited draft' : 'this AI draft'} can be used as-is.`}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                slotProps={{ input: { 'aria-describedby': helpId } }}
              />
            }
            label={
              isAdvice
                ? "I've read the advice and the reasons."
                : "I've read the draft and why it was flagged."
            }
          />
          {!acknowledged ? (
            <Typography id={helpId} variant="caption" color="text.secondary" component="p">
              Confirm you&apos;ve reviewed it to enable Approve. You can{' '}
              {isAdvice ? 'choose "Don\'t go ahead"' : 'reject'} at any time.
            </Typography>
          ) : null}
        </Box>
      ) : (
        <Typography variant="body2" id={helpId}>
          {blockedReason}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {canApprove ? (
          <Button
            variant="contained"
            color="success"
            onClick={() => decide('approved')}
            disabled={isPending || !acknowledged}
          >
            {isPending
              ? 'Saving…'
              : isAdvice
                ? 'Approve this use'
                : editedOutput
                  ? 'Approve edited draft'
                  : 'Approve'}
          </Button>
        ) : null}
        <Button
          variant="outlined"
          color="error"
          onClick={() => decide('rejected')}
          disabled={isPending}
          aria-describedby={canApprove ? undefined : helpId}
        >
          {isPending ? 'Saving…' : isAdvice ? "Don't go ahead" : 'Reject'}
        </Button>
      </Box>
    </Box>
  );
}
