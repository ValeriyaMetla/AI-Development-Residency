'use client';

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import {
  activateImportedPolicyAction,
  discardDraftPolicy,
  exportPolicy,
  importPolicy,
  type ImportPolicyResult,
} from './actions';

/**
 * Policy portability (Presentation layer, ADR-0003 / Epic 1 "own your rules"). Leader-only. The main
 * download is the readable policy document (/policy-seed/document → Print / Save as PDF); the backup
 * download is the active policy as a JSON file the org owns.
 *
 * Import is a REVIEWED DRAFT (ADR-0032 · PenTest F-20, F-08): the file is checked on the server,
 * saved as a draft that always keeps the org's safety rules, and shown here as a preview — with a
 * warning on any rule that reads like a command to the AI — until the leader activates or discards it.
 * No governance logic here: the Service actions decide (the Leak Test holds).
 */

type Msg = { severity: 'success' | 'error'; text: string } | null;
type Preview = Extract<ImportPolicyResult, { status: 'preview' }>;

export default function PolicyPortability() {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isPending, startTransition] = useTransition();
  const previewHeading = useRef<HTMLHeadingElement>(null);

  // Move keyboard and screen-reader focus to the preview as soon as it appears.
  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);

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
    setPreview(null);
    const reader = new FileReader();
    reader.onerror = () => setMsg({ severity: 'error', text: 'Could not read that file.' });
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      startTransition(async () => {
        const res = await importPolicy(text);
        if (res.status === 'preview') setPreview(res);
        else setMsg({ severity: 'error', text: res.message });
      });
    };
    reader.readAsText(file);
  }

  function activate() {
    if (!preview) return;
    const { policyId } = preview;
    startTransition(async () => {
      const res = await activateImportedPolicyAction(policyId);
      if (res.status === 'activated') {
        setPreview(null);
        setMsg({ severity: 'success', text: 'The imported policy is now active.' });
        router.refresh(); // re-sync the editor with the newly-active imported version
      } else {
        setMsg({ severity: 'error', text: res.message });
      }
    });
  }

  function discard() {
    startTransition(async () => {
      const res = await discardDraftPolicy();
      if (res.status === 'discarded') {
        setPreview(null);
        setMsg({ severity: 'success', text: 'Import discarded. Nothing was changed.' });
      } else {
        setMsg({ severity: 'error', text: res.message });
      }
    });
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle1" component="h2">
        Export or import your policy
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Download a readable copy of your policy to share, print, or save as a PDF. The backup file
        is for moving your rules to another account: importing one shows you a preview first, and
        nothing changes until you switch it on. Your safety rules always stay on.
      </Typography>

      {msg ? (
        <Alert severity={msg.severity} role="status">
          {msg.text}
        </Alert>
      ) : null}

      {preview ? (
        <Box
          component="section"
          aria-labelledby="import-preview-heading"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography
            id="import-preview-heading"
            ref={previewHeading}
            tabIndex={-1}
            variant="subtitle1"
            component="h3"
            sx={{ outline: 'none' }}
          >
            Review the imported policy
          </Typography>
          <Typography variant="body2">
            Nothing has changed yet. Check the rules below, then switch this policy on or discard
            it.
          </Typography>

          {preview.flagged.length > 0 ? (
            <Alert severity="warning">
              <AlertTitle>
                {preview.flagged.length === 1
                  ? 'One imported rule reads like an instruction to the AI'
                  : `${preview.flagged.length} imported rules read like instructions to the AI`}
              </AlertTitle>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {preview.flagged.map((f) => (
                  <li key={f.ruleText}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      “{f.ruleText}”
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                      {f.reasons.map((reason) => (
                        <li key={reason}>
                          <Typography variant="body2">{reason}</Typography>
                        </li>
                      ))}
                    </Box>
                  </li>
                ))}
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Hidden instructions can change what the AI writes. If you didn&apos;t write these
                rules, don&apos;t switch this policy on.
              </Typography>
            </Alert>
          ) : null}

          <Box>
            <Typography variant="subtitle2" component="h4">
              Safety rules that stay on ({preview.keptSafetyRules.length})
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {preview.keptSafetyRules.map((text) => (
                <li key={text}>
                  <Typography variant="body2">
                    {text} <strong>🔒 Safety floor — always on</strong>
                  </Typography>
                </li>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" component="h4">
              Rules from the file ({preview.importedRules.length})
            </Typography>
            {preview.importedRules.length > 0 ? (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {preview.importedRules.map((text) => (
                  <li key={text}>
                    <Typography variant="body2">{text}</Typography>
                  </li>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                The file only contained rules you already have as safety rules.
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={activate} disabled={isPending}>
              Activate this policy
            </Button>
            <Button variant="outlined" onClick={discard} disabled={isPending}>
              Discard this import
            </Button>
          </Box>
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant="contained" component={NextLink} href="/policy-seed/document">
          Download policy document
        </Button>
        <Button variant="outlined" onClick={doExport} disabled={isPending}>
          Download backup file (for re-import)
        </Button>
        <Button variant="outlined" component="label" disabled={isPending || preview !== null}>
          Import from file
          <input type="file" accept="application/json,.json" hidden onChange={onFile} />
        </Button>
      </Box>
    </Paper>
  );
}
