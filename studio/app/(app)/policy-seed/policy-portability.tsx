'use client';

import { useState, useTransition, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { exportPolicy, importPolicy } from './actions';

/**
 * Policy portability (Presentation layer, ADR-0003 / Epic 1 "own your rules"). Leader-only. The main
 * download is the readable policy document (/policy-seed/document → Print / Save as PDF); the backup
 * download is the active policy as a JSON file the org owns; import reads an uploaded file and, after
 * server-side validation, publishes it as a new active version. No governance logic here — both
 * buttons call the Service actions (the Leak Test holds).
 */

type Msg = { severity: 'success' | 'error'; text: string } | null;

export default function PolicyPortability() {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [isPending, startTransition] = useTransition();

  function doExport() {
    setMsg(null);
    startTransition(async () => {
      const res = await exportPolicy();
      if (res.status !== 'ok') {
        setMsg({ severity: 'error', text: res.message });
        return;
      }
      // Hand the file to the browser's download — a client-only step (no server file handling).
      const url = URL.createObjectURL(new Blob([res.json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ severity: 'success', text: 'Backup file downloaded.' });
    });
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be chosen again after an error
    if (!file) return;
    setMsg(null);
    const reader = new FileReader();
    reader.onerror = () => setMsg({ severity: 'error', text: 'Could not read that file.' });
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      startTransition(async () => {
        const res = await importPolicy(text);
        if (res.status === 'published') {
          setMsg({
            severity: 'success',
            text: `Imported — ${res.ruleCount} rule${res.ruleCount === 1 ? '' : 's'} now active.`,
          });
          router.refresh(); // re-sync the editor with the newly-active imported version
        } else {
          setMsg({ severity: 'error', text: res.message });
        }
      });
    };
    reader.readAsText(file);
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle1" component="h2">
        Export or import your policy
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Download a readable copy of your policy to share, print, or save as a PDF. The backup file
        is for moving your rules to another account: importing one publishes it as your new active
        version, and your safety rules still apply.
      </Typography>

      {msg ? (
        <Alert severity={msg.severity} role="status">
          {msg.text}
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant="contained" component={NextLink} href="/policy-seed/document">
          Download policy document
        </Button>
        <Button variant="outlined" onClick={doExport} disabled={isPending}>
          Download backup file (for re-import)
        </Button>
        <Button variant="outlined" component="label" disabled={isPending}>
          Import from file
          <input type="file" accept="application/json,.json" hidden onChange={onFile} />
        </Button>
      </Box>
    </Paper>
  );
}
