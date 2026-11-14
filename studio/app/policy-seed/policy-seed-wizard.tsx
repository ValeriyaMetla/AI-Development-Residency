'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import Checkbox from '@mui/material/Checkbox';
import { runPolicySeed, confirmPolicy, type RunPolicySeedResult } from '@/app/policy-seed/actions';
import type { PolicySeedAnswers, TriState } from '@/lib/domain/policy-seed-spec';
import PolicyRuleList from '@/app/policy-seed/policy-rule-list';

/**
 * Policy-seed intake wizard (Presentation layer, ADR-0003). A guided, one-question-per-step
 * flow; it only collects answers and calls the `runPolicySeed` server action — no business
 * logic or data access here. Answers are kept in localStorage so an accidental refresh or
 * navigation resumes where the leader left off (client-side resume, Option A).
 *
 * Accessibility: each step is an <h2> that receives focus on change; radio/checkbox groups
 * use FormLabel + aria-labelledby; every input is labeled; the whole flow is keyboard-operable.
 */

const STORAGE_KEY = 'policy-seed-draft-v1';

const PURPOSE_OPTIONS = [
  'Drafting emails, letters, or communications',
  'Summarizing documents or notes',
  'Research and finding information',
  'Writing or editing content (reports, grants, posts)',
  'Administrative help (scheduling, lists, cleanup)',
];

const LOCKED_PROHIBITIONS = [
  "We won't use AI to manipulate or deceive people.",
  "We won't use AI to score, rank, or judge people (for example, who deserves help).",
  "We won't use AI for any legally banned purpose.",
];

const TRISTATE_OPTIONS: { value: TriState; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not sure' },
];

type StepKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7';

type FormState = {
  name: string;
  role: string;
  purposes: string[];
  otherPurpose: string;
  handlesSensitiveData: TriState | '';
  higherStakes: TriState | '';
  externalContent: TriState | '';
  reviewer: string;
  customText: string;
};

const EMPTY: FormState = {
  name: '',
  role: '',
  purposes: [],
  otherPurpose: '',
  handlesSensitiveData: '',
  higherStakes: '',
  externalContent: '',
  reviewer: '',
  customText: '',
};

function loadDraft(): FormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<FormState>) };
  } catch {
    return EMPTY;
  }
}

/** Build the validated-shape answers object the server action expects. */
function toAnswers(f: FormState): PolicySeedAnswers {
  const purposes = [...f.purposes, f.otherPurpose.trim()].map((p) => p.trim()).filter(Boolean);
  const custom = f.customText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    accountablePerson: { name: f.name.trim(), role: f.role.trim() },
    purposes,
    handlesSensitiveData: (f.handlesSensitiveData || 'not_sure') as TriState,
    higherStakes: (f.higherStakes || 'not_sure') as TriState,
    externalContent: f.externalContent === '' ? undefined : f.externalContent,
    reviewer: f.reviewer.trim() || undefined,
    customProhibitedUses: custom.length ? custom : undefined,
  };
}

export default function PolicySeedWizard() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<RunPolicySeedResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [activated, setActivated] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activating, startActivating] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Resume: load any saved draft once, on mount.
  useEffect(() => {
    setForm(loadDraft());
  }, []);

  // Persist the draft whenever it changes (best-effort; ignore storage errors).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* storage unavailable (private mode, etc.) — the flow still works in-session */
    }
  }, [form]);

  // Q6 (reviewer) only applies when the work can be higher-stakes.
  const steps = useMemo<StepKey[]>(() => {
    const base: StepKey[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
    return form.higherStakes === 'no' ? base.filter((s) => s !== 'q6') : base;
  }, [form.higherStakes]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  // Move focus to the step heading on each step change (a11y).
  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex, step]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function togglePurpose(option: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      purposes: checked ? [...f.purposes, option] : f.purposes.filter((p) => p !== option),
    }));
  }

  // Whether the current step's required answer is present (optional steps are always ready).
  const canAdvance = (() => {
    switch (step) {
      case 'q1':
        return form.name.trim() !== '' && form.role.trim() !== '';
      case 'q2':
        return form.purposes.length > 0 || form.otherPurpose.trim() !== '';
      case 'q3':
        return form.handlesSensitiveData !== '';
      case 'q4':
        return form.higherStakes !== '';
      default:
        return true; // q5, q6, q7 are optional
    }
  })();

  function handleFinish() {
    startTransition(async () => {
      const res = await runPolicySeed(toAnswers(form));
      setResult(res);
      if (res.status === 'created') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    });
  }

  function handleActivate(policyId: string) {
    setActivateError(null);
    startActivating(async () => {
      const res = await confirmPolicy(policyId);
      if (res.status === 'activated') {
        setActivated(true);
      } else {
        setActivateError(res.message);
      }
    });
  }

  // Draft produced — show the rules for review, then let the leader activate it.
  if (result?.status === 'created') {
    if (activated) {
      return (
        <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="h6" component="h2">
            Your AI policy is active
          </Typography>
          <Typography variant="body1" color="text.secondary">
            It now applies to your organization&apos;s AI use. You can revisit and refine it any
            time.
          </Typography>
        </Paper>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Review your starter policy
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We drafted <strong>{result.ruleCount}</strong> rules from your answers
            {result.needsReviewCount > 0 ? (
              <>
                {' '}
                — <strong>{result.needsReviewCount}</strong> flagged for your review
              </>
            ) : null}
            . Read them over, then activate the policy for your organization.
          </Typography>
        </Box>

        <PolicyRuleList rules={result.rules} />

        {activateError ? <Alert severity="warning">{activateError}</Alert> : null}

        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => handleActivate(result.policyId)}
            disabled={activating}
          >
            {activating ? 'Activating…' : 'Activate this policy'}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Step {stepIndex + 1} of {steps.length}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={((stepIndex + 1) / steps.length) * 100}
          aria-label={`Progress: step ${stepIndex + 1} of ${steps.length}`}
        />
      </Box>

      <Box sx={{ minHeight: 220, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {step === 'q1' ? (
          <>
            <Typography variant="h6" component="h2" tabIndex={-1} ref={headingRef}>
              Who&apos;s responsible for how your organization uses AI?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The person with the final say, who others can go to with questions. This can be you.
            </Typography>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Role"
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              required
              fullWidth
            />
          </>
        ) : null}

        {step === 'q2' ? (
          <FormControl component="fieldset" variant="standard">
            <FormLabel component="legend">
              <Typography variant="h6" component="h2" tabIndex={-1} ref={headingRef}>
                What do you expect to use AI for?
              </Typography>
            </FormLabel>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Pick anything that fits. You can change this later.
            </Typography>
            <FormGroup>
              {PURPOSE_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option}
                  control={
                    <Checkbox
                      checked={form.purposes.includes(option)}
                      onChange={(e) => togglePurpose(option, e.target.checked)}
                    />
                  }
                  label={option}
                />
              ))}
            </FormGroup>
            <TextField
              label="Something else (optional)"
              value={form.otherPurpose}
              onChange={(e) => update('otherPurpose', e.target.value)}
              fullWidth
              sx={{ mt: 1 }}
            />
          </FormControl>
        ) : null}

        {step === 'q3' ? (
          <TriStateStep
            headingRef={headingRef}
            heading="Will AI ever work with personal or sensitive information?"
            help="For example: donor or client details, health or financial information, anything confidential."
            value={form.handlesSensitiveData}
            onChange={(v) => update('handlesSensitiveData', v)}
          />
        ) : null}

        {step === 'q4' ? (
          <TriStateStep
            headingRef={headingRef}
            heading="Will AI help with higher-stakes decisions or work?"
            help="Anything that could affect a person's services, money, rights, safety, or reputation."
            value={form.higherStakes}
            onChange={(v) => update('higherStakes', v)}
          />
        ) : null}

        {step === 'q5' ? (
          <TriStateStep
            headingRef={headingRef}
            heading="Will AI-generated content be shared with people outside your organization?"
            help="Such as clients, donors, partners, or the public. You can skip this."
            value={form.externalContent}
            onChange={(v) => update('externalContent', v)}
          />
        ) : null}

        {step === 'q6' ? (
          <>
            <Typography variant="h6" component="h2" tabIndex={-1} ref={headingRef}>
              For higher-stakes AI work, who should check it before it&apos;s used or sent?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A person reviews and approves before it goes out. Leave blank to use the person you
              named first.
            </Typography>
            <TextField
              label="Reviewer name or role (optional)"
              value={form.reviewer}
              onChange={(e) => update('reviewer', e.target.value)}
              fullWidth
            />
          </>
        ) : null}

        {step === 'q7' ? (
          <>
            <Typography variant="h6" component="h2" tabIndex={-1} ref={headingRef}>
              Are there things you want to rule out completely?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              These limits are always on and can&apos;t be turned off:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {LOCKED_PROHIBITIONS.map((rule) => (
                <li key={rule}>
                  <Typography variant="body2">{rule}</Typography>
                </li>
              ))}
            </Box>
            <TextField
              label="Add your own limits (one per line, optional)"
              value={form.customText}
              onChange={(e) => update('customText', e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </>
        ) : null}
      </Box>

      {result ? <Alert severity="warning">{result.message}</Alert> : null}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0 || pending}
        >
          Back
        </Button>
        {isLast ? (
          <Button variant="contained" onClick={handleFinish} disabled={!canAdvance || pending}>
            {pending ? 'Generating…' : 'Generate my policy'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => setStepIndex((i) => i + 1)}
            disabled={!canAdvance || pending}
          >
            Next
          </Button>
        )}
      </Box>
    </Box>
  );
}

function TriStateStep({
  headingRef,
  heading,
  help,
  value,
  onChange,
}: {
  headingRef: React.Ref<HTMLHeadingElement>;
  heading: string;
  help: string;
  value: TriState | '';
  onChange: (v: TriState) => void;
}) {
  return (
    <FormControl>
      <FormLabel>
        <Typography variant="h6" component="h2" tabIndex={-1} ref={headingRef}>
          {heading}
        </Typography>
      </FormLabel>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {help}
      </Typography>
      <RadioGroup value={value} onChange={(e) => onChange(e.target.value as TriState)}>
        {TRISTATE_OPTIONS.map((opt) => (
          <FormControlLabel
            key={opt.value}
            value={opt.value}
            control={<Radio />}
            label={opt.label}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
