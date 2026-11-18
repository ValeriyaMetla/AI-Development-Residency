'use client';

import { useState, useTransition } from 'react';
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
 */
export default function ReviewActions({
  taskRunId,
  output,
}: {
  taskRunId: string;
  output: string;
}) {
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(output);
  const [done, setDone] = useState<ReviewDecision | null>(null);
  const [doneEdited, setDoneEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      } else {
        setError(res.message);
      }
    });
  }

  if (done) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Alert severity={done === 'approved' ? 'success' : 'info'} role="status">
          {done === 'approved' ? 'Approved' : 'Rejected'} — your decision is recorded.
        </Alert>
        {done === 'approved' ? (
          <Typography variant="caption" color="text.secondary">
            {composeProvenance({ approved: true, edited: doneEdited })}
          </Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {editing ? (
        <TextField
          label="Your edited draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          multiline
          minRows={4}
          fullWidth
          slotProps={{ htmlInput: { maxLength: MAX_EDITED_OUTPUT } }}
        />
      ) : (
        <Box>
          <Button variant="text" size="small" onClick={() => setEditing(true)}>
            Edit the draft before approving
          </Button>
        </Box>
      )}
      {editing ? (
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

      <Box>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          Approving means {editedOutput ? 'your edited draft' : 'this AI draft'} can be used as-is.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              slotProps={{ input: { 'aria-describedby': 'approve-gate-help' } }}
            />
          }
          label="I've read the draft and why it was flagged."
        />
        {!acknowledged ? (
          <Typography id="approve-gate-help" variant="caption" color="text.secondary" component="p">
            Confirm you&apos;ve reviewed it to enable Approve. You can reject at any time.
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="success"
          onClick={() => decide('approved')}
          disabled={isPending || !acknowledged}
        >
          {isPending ? 'Saving…' : editedOutput ? 'Approve edited draft' : 'Approve'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => decide('rejected')}
          disabled={isPending}
        >
          {isPending ? 'Saving…' : 'Reject'}
        </Button>
      </Box>
    </Box>
  );
}
