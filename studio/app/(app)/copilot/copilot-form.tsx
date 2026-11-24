'use client';

import { useRef, useState, type FormEvent } from 'react';
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
import { assessUse } from './actions';
import {
  missingNoneApplyConfirmation,
  tierLabel,
  type CopilotVerdict,
  type SignalKey,
} from '@/lib/domain/copilot';
import { COPILOT_QUESTIONS, NONE_APPLY_ERROR, NONE_APPLY_LABEL } from './copilot-questions';
import type { CopilotAssessmentResult } from '@/lib/domain/copilot-pipeline';
import { VERDICT_TITLES } from '@/lib/domain/copilot-review';

// Titles are shared with the Human Review screen (`VERDICT_TITLES`), so both say the same words.
const VERDICT: Record<CopilotVerdict, { title: string; severity: AlertColor }> = {
  use: { title: VERDICT_TITLES.use, severity: 'success' },
  use_with_conditions: { title: VERDICT_TITLES.use_with_conditions, severity: 'warning' },
  dont: { title: VERDICT_TITLES.dont, severity: 'error' },
  out_of_scope: { title: VERDICT_TITLES.out_of_scope, severity: 'info' },
};

export default function CopilotForm() {
  const [userInput, setUserInput] = useState('');
  const [signals, setSignals] = useState<Partial<Record<SignalKey, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotAssessmentResult | null>(null);
  const [noneApply, setNoneApply] = useState(false);
  const [noneApplyError, setNoneApplyError] = useState(false);
  const noneApplyRef = useRef<HTMLInputElement>(null);

  const anyTicked = COPILOT_QUESTIONS.some((q) => signals[q.key] === true);

  const toggle = (key: SignalKey) => (_: unknown, checked: boolean) => {
    setSignals((s) => ({ ...s, [key]: checked }));
    setNoneApplyError(false);
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Same rule the server enforces; checked here too so the Leader gets help before a round trip.
    if (missingNoneApplyConfirmation(signals, noneApply)) {
      setNoneApplyError(true);
      noneApplyRef.current?.focus();
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      // A ticked risk box makes the confirmation moot — never send a stale "none apply".
      setResult(await assessUse({ userInput, signals, noneApply: !anyTicked && noneApply }));
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
          {COPILOT_QUESTIONS.map((q) => {
            const hintId = `copilot-hint-${q.key}`;
            return (
              <Box key={q.key} sx={{ mb: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={signals[q.key] ?? false}
                      onChange={toggle(q.key)}
                      // The explanation is read with the checkbox, not hidden in a tooltip.
                      slotProps={{ input: { 'aria-describedby': hintId } }}
                    />
                  }
                  label={q.label}
                />
                <Typography
                  id={hintId}
                  variant="body2"
                  color="text.secondary"
                  // Indent to line up under the label text, past the checkbox.
                  sx={{ pl: 4 }}
                >
                  {q.hint}
                </Typography>
              </Box>
            );
          })}

          {/* Only when nothing is ticked: a blank form must be a deliberate "none apply". */}
          {!anyTicked ? (
            <Box sx={{ mt: 1, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={noneApply}
                    onChange={(_, checked) => {
                      setNoneApply(checked);
                      if (checked) setNoneApplyError(false);
                    }}
                    slotProps={{
                      input: {
                        ref: noneApplyRef,
                        'aria-invalid': noneApplyError,
                        'aria-describedby': noneApplyError ? 'copilot-none-apply-error' : undefined,
                      },
                    }}
                  />
                }
                label={NONE_APPLY_LABEL}
              />
              {noneApplyError ? (
                // Words + role="alert" (announced), not color alone (WCAG 2.2 AA).
                <Typography
                  id="copilot-none-apply-error"
                  role="alert"
                  variant="body2"
                  color="error"
                  sx={{ pl: 4 }}
                >
                  {NONE_APPLY_ERROR}
                </Typography>
              ) : null}
            </Box>
          ) : null}
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

      {/* What was removed before the AI saw the text — categories only, never the values. */}
      {result.piiNotice && (
        <Alert severity="info" variant="outlined">
          {result.piiNotice}
        </Alert>
      )}

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
