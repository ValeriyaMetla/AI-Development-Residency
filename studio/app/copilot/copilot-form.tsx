'use client';

import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import type { AlertColor } from '@mui/material/Alert';
import { assessUse } from '@/app/copilot/actions';
import { tierLabel, type CopilotVerdict, type SignalKey } from '@/lib/domain/copilot';
import type { CopilotAssessmentResult } from '@/lib/domain/copilot-pipeline';

const QUESTIONS: { key: SignalKey; label: string }[] = [
  { key: 'judgesPerson', label: 'Would AI judge, rank, score, or decide about a specific person?' },
  {
    key: 'highStakesDomain',
    label:
      'Is this a high-stakes area — health, legal, financial, housing/benefits, safety, or crisis?',
  },
  {
    key: 'sensitiveData',
    label:
      'Does this involve sensitive personal data (health, financial, case details, or info about vulnerable people)?',
  },
  {
    key: 'bannedPurpose',
    label: 'Is the purpose manipulation, surveillance, social scoring, or anything illegal?',
  },
  {
    key: 'outputLeavesOrg',
    label:
      'Will the output be sent outside your organization (to a client, funder, or the public)?',
  },
];

const VERDICT: Record<CopilotVerdict, { title: string; severity: AlertColor }> = {
  use: { title: 'Go ahead', severity: 'success' },
  use_with_conditions: { title: 'Use with conditions', severity: 'warning' },
  dont: { title: "Don't use AI for this", severity: 'error' },
  out_of_scope: { title: 'This needs a person to decide', severity: 'info' },
};

export default function CopilotForm() {
  const [userInput, setUserInput] = useState('');
  const [signals, setSignals] = useState<Partial<Record<SignalKey, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotAssessmentResult | null>(null);

  const toggle = (key: SignalKey) => (_: unknown, checked: boolean) =>
    setSignals((s) => ({ ...s, [key]: checked }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      setResult(await assessUse({ userInput, signals }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <TextField
          label="Describe the AI use you're considering"
          placeholder="e.g. Use AI to help write responses to clients who are in a housing crisis."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          multiline
          minRows={3}
          required
          fullWidth
        />

        <FormGroup>
          <Typography variant="subtitle2" gutterBottom>
            A few quick questions
          </Typography>
          {QUESTIONS.map((q) => (
            <FormControlLabel
              key={q.key}
              control={<Checkbox checked={signals[q.key] ?? false} onChange={toggle(q.key)} />}
              label={q.label}
            />
          ))}
        </FormGroup>

        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? 'Checking…' : 'Get advice'}
        </Button>
      </Box>

      {result && <Result result={result} />}
    </Box>
  );
}

function Result({ result }: { result: CopilotAssessmentResult }) {
  if (result.status === 'blocked') {
    return (
      <Alert severity="info">
        <AlertTitle>We couldn&apos;t assess this</AlertTitle>
        {result.message}
      </Alert>
    );
  }

  const r = result.recommendation;
  const v = VERDICT[r.verdict];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-live="polite">
      <Alert severity={v.severity}>
        <AlertTitle sx={{ fontWeight: 700 }}>{v.title}</AlertTitle>
        {r.summary}
      </Alert>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={r.tierLabel} size="small" />
        {r.humanDecisionRequired && (
          <Chip label="A person must approve" size="small" variant="outlined" />
        )}
      </Box>

      {r.saferWay && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            {r.saferWay.noSafePath ? 'There is no safe way to do this' : 'How to make this safer'}
          </Typography>
          {!r.saferWay.noSafePath && (
            <>
              <Box component="ul" sx={{ mt: 0, pl: 3 }}>
                {r.saferWay.mitigations.map((m) => (
                  <Typography component="li" variant="body2" key={m.signalKey}>
                    {m.plainText}
                  </Typography>
                ))}
              </Box>
              <Typography variant="body2" color="text.secondary">
                If you apply these, this would become{' '}
                <strong>{tierLabel(r.saferWay.projectedTier)}</strong>.
              </Typography>
            </>
          )}
        </Box>
      )}

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<Box aria-hidden>▾</Box>}>
          <Typography variant="subtitle2">Why — and the standards behind it</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {r.reasons.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No specific risk signals — only the baseline rules below apply.
            </Typography>
          )}
          {r.reasons.map((reason) => (
            <Box key={reason.signalKey}>
              <Typography variant="body2">{reason.plainText}</Typography>
              {reason.citations.map((c) => (
                <Typography
                  key={c.code}
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block' }}
                >
                  Source: {c.text}
                </Typography>
              ))}
            </Box>
          ))}
          <Divider />
          <Typography variant="caption" color="text.secondary">
            These always apply: {r.baselineRules.map((c) => c.text).join('; ')}.
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Divider />
      <Typography variant="caption" color="text.secondary">
        AI-assisted governance advice — a person decides.
        {r.policyApplied
          ? ' Checked against your organization’s active policy.'
          : ' Grounded in baseline standards (you haven’t set an org policy yet).'}
      </Typography>
    </Box>
  );
}
