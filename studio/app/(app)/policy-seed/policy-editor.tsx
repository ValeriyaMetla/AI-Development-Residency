'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Divider from '@mui/material/Divider';
import { publishRuleEdits } from './actions';
import type { FlaggedRule } from '@/lib/domain/policy-injection-scan';
import { MAX_RULE_TEXT } from '@/lib/domain/policy-edit';
import { SAFETY_FLOOR_LABEL } from './policy-rule-list';

/**
 * Rule editor (Presentation layer, ADR-0003 / ADR-0024). The leader edits/retires non-baseline
 * rules and adds custom ones; baseline-safety rules are shown locked and cannot be touched.
 * Publishing calls the Service action, which assembles a NEW policy version and activates it — no
 * governance logic here (the Leak Test holds; the same publish would work from a script).
 */

export type EditorRule = {
  id: string;
  ruleText: string;
  isBaselineSafety: boolean;
  citation: string | null;
};

let addKeySeq = 0;

export default function PolicyEditor({ rules }: { rules: EditorRule[] }) {
  const router = useRouter();
  const baseline = rules.filter((r) => r.isBaselineSafety);
  const [editable, setEditable] = useState(
    rules.filter((r) => !r.isBaselineSafety).map((r) => ({ id: r.id, ruleText: r.ruleText })),
  );
  const [additions, setAdditions] = useState<{ key: number; ruleText: string }[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ADR-0032: rules this edit changes or adds that read like commands to the AI. Warn, never block.
  const [warning, setWarning] = useState<FlaggedRule[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function editRule(id: string, ruleText: string) {
    setEditable((rs) => rs.map((r) => (r.id === id ? { ...r, ruleText } : r)));
  }
  function retireRule(id: string) {
    setEditable((rs) => rs.filter((r) => r.id !== id));
  }
  function addRule() {
    setAdditions((a) => [...a, { key: ++addKeySeq, ruleText: '' }]);
  }
  function editAddition(key: number, ruleText: string) {
    setAdditions((a) => a.map((r) => (r.key === key ? { ...r, ruleText } : r)));
  }
  function removeAddition(key: number) {
    setAdditions((a) => a.filter((r) => r.key !== key));
  }

  function publish(confirmCommandLike = false) {
    setError(null);
    setDone(null);
    setWarning(null);
    const input = {
      edits: editable.map((e) => ({ id: e.id, ruleText: e.ruleText })),
      additions: additions.map((a) => a.ruleText),
    };
    startTransition(async () => {
      const res = await publishRuleEdits(input, { confirmCommandLike });
      if (res.status === 'published') {
        setDone(`Published — ${res.ruleCount} rule${res.ruleCount === 1 ? '' : 's'} now active.`);
        setAdditions([]);
        router.refresh(); // re-sync the editor with the newly-active version
      } else if (res.status === 'confirm') {
        setWarning(res.flagged); // nothing published yet; the leader decides
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {done ? (
        <Alert severity="success" role="status">
          {done}
        </Alert>
      ) : null}

      {baseline.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" component="h2">
            Always-on safety rules
          </Typography>
          <Typography variant="caption" color="text.secondary">
            These stay on in every version — they can&apos;t be edited or removed.
          </Typography>
          {baseline.map((r) => (
            <Paper key={r.id} variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body1">{r.ruleText}</Typography>
              <Chip size="small" label={SAFETY_FLOOR_LABEL} sx={{ mt: 1 }} />
            </Paper>
          ))}
        </Box>
      ) : null}

      <Divider />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="subtitle1" component="h2">
          Your rules
        </Typography>
        {editable.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No editable rules — add one below, or publish with the safety rules only.
          </Typography>
        ) : (
          editable.map((r) => (
            <Paper
              key={r.id}
              variant="outlined"
              sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
            >
              <TextField
                label="Rule"
                value={r.ruleText}
                onChange={(e) => editRule(r.id, e.target.value)}
                multiline
                minRows={2}
                fullWidth
                slotProps={{ htmlInput: { maxLength: MAX_RULE_TEXT } }}
              />
              <Box>
                <Button size="small" color="error" onClick={() => retireRule(r.id)}>
                  Retire this rule
                </Button>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {additions.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle2" component="h3">
            New rules
          </Typography>
          {additions.map((a) => (
            <Paper
              key={a.key}
              variant="outlined"
              sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
            >
              <TextField
                label="New rule"
                placeholder="Write one plain-language rule."
                value={a.ruleText}
                onChange={(e) => editAddition(a.key, e.target.value)}
                multiline
                minRows={2}
                fullWidth
                slotProps={{ htmlInput: { maxLength: MAX_RULE_TEXT } }}
              />
              <Box>
                <Button size="small" color="error" onClick={() => removeAddition(a.key)}>
                  Remove
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : null}

      <Box>
        <Button variant="outlined" onClick={addRule} disabled={isPending}>
          + Add a rule
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" role="status">
          {error}
        </Alert>
      ) : null}

      {warning ? (
        <Alert severity="warning" role="alert">
          <AlertTitle>
            {warning.length === 1
              ? 'One rule reads like an instruction to the AI'
              : `${warning.length} rules read like instructions to the AI`}
          </AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {warning.map((f) => (
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
            Rules are shown to the AI as policy, not as commands, but wording like this can still
            change what it writes. Nothing has been published yet.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 1.5 }}>
            <Button variant="outlined" onClick={() => setWarning(null)} disabled={isPending}>
              Go back and edit
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => publish(true)}
              disabled={isPending}
            >
              Publish anyway
            </Button>
          </Box>
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button variant="contained" size="large" onClick={() => publish()} disabled={isPending}>
          {isPending ? 'Publishing…' : 'Publish changes'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Publishing makes this your active policy. Past runs keep the rules they were checked
          against.
        </Typography>
      </Box>
    </Box>
  );
}
