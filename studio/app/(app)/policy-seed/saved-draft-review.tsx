'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import type { NewPolicyRule } from '@/lib/data/policy';
import { confirmPolicy, discardDraftPolicy } from './actions';
import PolicyRuleList from './policy-rule-list';
import PolicyActivated from './policy-activated';

/**
 * Resume a saved draft (Presentation only; Epic 8 resume-after-interruption). A leader who
 * generated a starter policy but left before activating it lands here — on any device — instead
 * of an empty wizard. Same review-then-Activate step as the wizard (human-in-the-loop), plus a
 * confirmed "Start over" that discards the draft via the `discardDraftPolicy` action.
 *
 * Accessibility: the Start-over confirmation is inline (no modal), moves focus to its prompt, and
 * every control is a labelled native button.
 */
export default function SavedDraftReview({
  policyId,
  rules,
}: {
  policyId: string;
  rules: NewPolicyRule[];
}) {
  const router = useRouter();
  const [activated, setActivated] = useState(false);
  const [confirmingStartOver, setConfirmingStartOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (confirmingStartOver) confirmRef.current?.focus();
  }, [confirmingStartOver]);

  const needsReviewCount = rules.filter((r) => r.needsReview).length;

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const res = await confirmPolicy(policyId);
      if (res.status === 'activated') setActivated(true);
      else setError(res.message);
    });
  }

  function handleStartOver() {
    setError(null);
    startTransition(async () => {
      const res = await discardDraftPolicy();
      if (res.status === 'discarded') router.refresh();
      else setError(res.message);
    });
  }

  if (activated) return <PolicyActivated />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" component="h2" gutterBottom>
          Pick up where you left off
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You already drafted a starter policy with <strong>{rules.length}</strong> rules
          {needsReviewCount > 0 ? (
            <>
              {' '}
              — <strong>{needsReviewCount}</strong> flagged for your review
            </>
          ) : null}
          . It isn&apos;t active yet. Read it over, then activate it for your organization.
        </Typography>
      </Box>

      <PolicyRuleList rules={rules} />

      {error ? <Alert severity="warning">{error}</Alert> : null}

      {confirmingStartOver ? (
        <Alert severity="info" role="group" aria-labelledby="start-over-prompt">
          <Typography id="start-over-prompt" variant="body2" tabIndex={-1} ref={confirmRef}>
            Start over with new answers? This draft will be set aside and won&apos;t be used.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button variant="outlined" onClick={handleStartOver} disabled={pending}>
              {pending ? 'Starting over…' : 'Yes, start over'}
            </Button>
            <Button onClick={() => setConfirmingStartOver(false)} disabled={pending}>
              Keep this draft
            </Button>
          </Box>
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" size="large" onClick={handleActivate} disabled={pending}>
          {pending && !confirmingStartOver ? 'Activating…' : 'Activate this policy'}
        </Button>
        {!confirmingStartOver ? (
          <Button onClick={() => setConfirmingStartOver(true)} disabled={pending}>
            Start over
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
