'use client';

import { useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { runThankYou } from '@/app/skills/actions';
import type { RunResult } from '@/lib/domain/pipeline';

/**
 * Walking-skeleton UI (Presentation layer): triggers the governed-run pipeline via the
 * server action and shows the result. No business logic or data access here — it only
 * calls the Service-layer action (ADR-0003). `import type` keeps the server-only
 * pipeline module out of the client bundle.
 */
export default function ThankYouRunner() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRun() {
    const value = input.trim();
    if (!value) return;
    startTransition(async () => {
      setResult(await runThankYou(value));
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" component="h2">
        Draft a thank-you note
      </Typography>
      <TextField
        label="Who are you thanking, and what for?"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        multiline
        minRows={2}
        fullWidth
        disabled={pending}
      />
      <Box>
        <Button variant="contained" onClick={handleRun} disabled={pending || !input.trim()}>
          {pending ? 'Drafting…' : 'Draft with AI'}
        </Button>
      </Box>

      {result?.status === 'blocked' ? <Alert severity="warning">{result.message}</Alert> : null}

      {result && result.status !== 'blocked' ? (
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {result.output}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip size="small" label={result.provenanceLabel} />
            {result.status === 'needs_review' ? (
              <Chip size="small" color="warning" label="Needs review" />
            ) : null}
          </Box>
        </Paper>
      ) : null}
    </Box>
  );
}
