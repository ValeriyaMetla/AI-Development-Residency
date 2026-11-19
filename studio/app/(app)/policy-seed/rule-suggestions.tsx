'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { acceptRuleSuggestion, dismissRuleSuggestion } from './suggestion-actions';
import { MAX_RULE_TEXT } from '@/lib/domain/policy-edit';

/**
 * Rule suggestions (Presentation layer, ADR-0003 / ADR-0025) — card: Build "accept suggested rule"
 * flow. Shows the leader each net-new suggestion with its count-only evidence and citation, lets
 * them reword it, then add it or dismiss it. No governance logic here: whether a suggestion is
 * valid, and its citation, are re-derived on the server by the actions (the Leak Test holds).
 *
 * Accessibility: a labelled <section> with an <h2>; every field labelled with its citation linked as
 * helper text; real buttons; status/errors announced via role="status"; after a card is resolved,
 * focus returns to the section heading so keyboard and screen-reader users aren't stranded.
 */

export type SuggestionView = {
  key: string;
  ruleText: string;
  citation: string;
  evidenceLabel: string;
};

export default function RuleSuggestions({
  suggestions,
  unavailable,
}: {
  suggestions: SuggestionView[];
  unavailable: boolean;
}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [resolved, setResolved] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const visible = suggestions.filter((s) => !resolved.includes(s.key));

  function onResolved(key: string, text: string) {
    setResolved((r) => [...r, key]);
    setMessage(text);
    headingRef.current?.focus();
    router.refresh(); // the editor below re-syncs with the new active version
  }

  return (
    <Box
      component="section"
      aria-labelledby="rule-suggestions-heading"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      <Typography
        id="rule-suggestions-heading"
        variant="subtitle1"
        component="h2"
        tabIndex={-1}
        ref={headingRef}
      >
        Suggested from your usage
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Based on how your team used AI in the last 30 days. Nothing is added unless you add it.
      </Typography>

      {message ? (
        <Alert severity="success" role="status">
          {message}
        </Alert>
      ) : null}

      {unavailable ? (
        <Alert severity="info">
          Suggestions are unavailable right now. Please try again later.
        </Alert>
      ) : visible.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No new suggestions. We&apos;ll suggest a rule when a kind of task keeps coming up.
        </Typography>
      ) : (
        visible.map((s) => <SuggestionCard key={s.key} suggestion={s} onResolved={onResolved} />)
      )}
    </Box>
  );
}

function SuggestionCard({
  suggestion,
  onResolved,
}: {
  suggestion: SuggestionView;
  onResolved: (key: string, message: string) => void;
}) {
  const [text, setText] = useState(suggestion.ruleText);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fieldId = `suggestion-${suggestion.key.replace(/[^a-z0-9-]/g, '-')}`;

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await acceptRuleSuggestion({ suggestionKey: suggestion.key, ruleText: text });
      if (res.status === 'accepted') onResolved(suggestion.key, 'Added — the rule is now active.');
      else setError(res.message);
    });
  }

  function dismiss() {
    setError(null);
    startTransition(async () => {
      const res = await dismissRuleSuggestion({ suggestionKey: suggestion.key });
      if (res.status === 'dismissed') {
        onResolved(suggestion.key, 'Dismissed — it won’t be suggested again.');
      } else {
        setConfirming(false);
        setError(res.message);
      }
    });
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {suggestion.evidenceLabel}
      </Typography>
      <TextField
        id={fieldId}
        label="Suggested rule"
        value={text}
        onChange={(e) => setText(e.target.value)}
        multiline
        minRows={2}
        fullWidth
        disabled={isPending}
        helperText={`Grounded in: ${suggestion.citation}`}
        slotProps={{ htmlInput: { maxLength: MAX_RULE_TEXT } }}
      />
      <Typography variant="caption" color="text.secondary">
        Adding publishes a new version of your rules right away. Publish or discard any unsaved
        edits below first — they will be cleared.
      </Typography>

      {error ? (
        <Alert severity="error" role="status">
          {error}
        </Alert>
      ) : null}

      {confirming ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">
            Dismiss for good? It won&apos;t be suggested again.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={dismiss}
            disabled={isPending}
          >
            {isPending ? 'Dismissing…' : 'Yes, dismiss'}
          </Button>
          <Button size="small" onClick={() => setConfirming(false)} disabled={isPending} autoFocus>
            Cancel
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button variant="contained" onClick={add} disabled={isPending}>
            {isPending ? 'Adding…' : 'Add to my rules'}
          </Button>
          <Button onClick={() => setConfirming(true)} disabled={isPending}>
            Dismiss
          </Button>
        </Box>
      )}
    </Paper>
  );
}
