'use client';

import { useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import { submitCorrection } from './actions';
import {
  MAX_CORRECTION_NOTE,
  kindLabel,
  type CorrectionEntry,
  type CorrectionKind,
} from '@/lib/domain/corrections';

/**
 * Row-level correction / note control for one of the caller's own runs (Presentation layer,
 * ADR-0003 / ADR-0021). Shows the notes already recorded on this run, and opens a dialog to add
 * another. A correction is ADDITIVE — the dialog copy makes clear the original record is never
 * changed, only annotated. Calls the single Service action; no governance logic here (Leak Test).
 *
 * Accessibility: the dialog is labelled by its title, the kind is a labelled radio group, the note
 * field is required and announces its error, and the trigger names the run it annotates.
 */
export default function CorrectionActions({
  runId,
  skillName,
  corrections,
}: {
  runId: string;
  skillName: string;
  corrections: CorrectionEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CorrectionKind>('note');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<CorrectionKind | null>(null);
  const [isPending, startTransition] = useTransition();

  const noteIsEmpty = note.trim() === '';

  function close() {
    setOpen(false);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await submitCorrection({ taskRunId: runId, kind, note });
      if (res.status === 'done') {
        setJustSaved(res.kind);
        setNote('');
        setKind('note');
        setOpen(false);
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
      {corrections.length > 0 ? (
        <Box
          component="ul"
          aria-label={`Your notes on this ${skillName} run`}
          sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}
        >
          {corrections.map((c) => (
            <Box
              component="li"
              key={c.id}
              sx={{ display: 'flex', gap: 0.75, alignItems: 'baseline' }}
            >
              <Chip
                label={kindLabel(c.kind)}
                size="small"
                color={c.kind === 'correction' ? 'warning' : 'default'}
                variant="outlined"
              />
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {c.note}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : null}

      {justSaved ? (
        <Alert severity="success" role="status" sx={{ py: 0 }}>
          {kindLabel(justSaved)} saved.
        </Alert>
      ) : null}

      <Button size="small" variant="text" onClick={() => setOpen(true)}>
        {corrections.length > 0 ? 'Add another note' : 'Add a note'}
      </Button>

      <Dialog
        open={open}
        onClose={close}
        aria-labelledby={`correction-title-${runId}`}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id={`correction-title-${runId}`}>Annotate your {skillName} run</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This adds a note alongside the record. It never changes or deletes what was originally
            logged — your annotation is kept as its own entry.
          </Typography>

          <FormControl sx={{ mb: 2 }}>
            <FormLabel id={`correction-kind-${runId}`}>What is this?</FormLabel>
            <RadioGroup
              row
              aria-labelledby={`correction-kind-${runId}`}
              value={kind}
              onChange={(e) => setKind(e.target.value as CorrectionKind)}
            >
              <FormControlLabel value="note" control={<Radio />} label="Note (add context)" />
              <FormControlLabel
                value="correction"
                control={<Radio />}
                label="Correction (the record is wrong)"
              />
            </RadioGroup>
          </FormControl>

          <TextField
            label="Your note"
            placeholder="A short, plain note — no sensitive details."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            multiline
            minRows={3}
            fullWidth
            error={Boolean(error)}
            helperText={error ?? `${note.trim().length}/${MAX_CORRECTION_NOTE}`}
            slotProps={{ htmlInput: { maxLength: MAX_CORRECTION_NOTE, 'aria-required': true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={isPending || noteIsEmpty}>
            {isPending ? 'Saving…' : 'Save note'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
