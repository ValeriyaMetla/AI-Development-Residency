'use client';

import { useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { runSkill } from './actions';
import ReviewActions from '@/app/(app)/approvals/review-actions';
import { applicableRules } from '@/lib/domain/skills';
import type { RunnableSkill } from '@/lib/data/runs';
import type { RunResult } from '@/lib/domain/pipeline';
import { detectPii, type PiiCategory } from '@/lib/domain/pii';
import { coachingFor, type CoachingNudge } from '@/lib/domain/coaching';

/** Display-only policy-rule guidance passed from the server page. */
export type RuleGuidance = { ruleText: string; category: string; citation: string | null };

/**
 * Skill runner (Presentation layer). Picks a Skill, takes the Doer's who/what input, calls the
 * Service action, and shows the result with its status and provenance label. No business logic or
 * data access here — it only calls the server action (ADR-0003). `import type` keeps the
 * server-only pipeline module out of the client bundle.
 */

type InputHint = { label: string; placeholder: string; help: string };

const INPUT_HINTS: Record<string, InputHint> = {
  draft_thank_you: {
    label: 'Who are you thanking, and what for?',
    placeholder: 'e.g. Maria — her $50 monthly gift and volunteering at our food drive',
    help: 'A few words about the person and what they did. A name is optional.',
  },
};

const DEFAULT_HINT: InputHint = {
  label: 'What do you need?',
  placeholder: 'Describe the task in a sentence or two.',
  help: '',
};

const STATUS_CHIP: Record<
  'completed' | 'needs_review',
  { label: string; color: 'success' | 'warning' }
> = {
  completed: { label: 'Ready to review', color: 'success' },
  needs_review: { label: 'Needs your review', color: 'warning' },
};

export default function SkillRunner({
  skills,
  policyRules = [],
}: {
  skills: RunnableSkill[];
  policyRules?: RuleGuidance[];
}) {
  const [skillKey, setSkillKey] = useState(skills[0]?.key ?? '');
  const [input, setInput] = useState('');
  const [lastInput, setLastInput] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [dismissedCoaching, setDismissedCoaching] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  if (skills.length === 0) {
    return <Alert severity="info">No Skills are available to run yet.</Alert>;
  }

  const hint = INPUT_HINTS[skillKey] ?? DEFAULT_HINT;
  const multiple = skills.length > 1;
  const rules = applicableRules(skillKey, policyRules);
  // In-the-moment heads-up: the pure detector runs live on what the Doer has typed, so they see it
  // before submitting. Non-blocking — it never stops the run (Epic 5 "in-the-moment PII warning").
  const livePii = detectPii(input);
  // In-the-moment coaching (Epic 6): the same pure risk detector, surfaced as a kind nudge with a
  // concrete safer way — a guide, never a block. A dismissed pattern won't nag again this session.
  const coaching = coachingFor(input).filter((n) => !dismissedCoaching.includes(n.id));

  // A fresh run uses the textarea; a keep re-run reuses the exact input that produced the result.
  function run(keep: PiiCategory[]) {
    const text = keep.length > 0 ? lastInput : input;
    setResult(null);
    startTransition(async () => {
      setLastInput(text);
      setResult(await runSkill(skillKey, text, keep));
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {rules.length > 0 ? <ApplicableRulesPanel rules={rules} /> : null}

      <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {multiple ? (
          <TextField
            select
            label="Skill"
            value={skillKey}
            onChange={(e) => {
              setSkillKey(e.target.value);
              setResult(null);
            }}
            fullWidth
          >
            {skills.map((s) => (
              <MenuItem key={s.key} value={s.key}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Box>
            <Typography variant="overline" color="text.secondary">
              Skill
            </Typography>
            <Typography variant="h6" component="p">
              {skills[0].name}
            </Typography>
          </Box>
        )}

        <TextField
          label={hint.label}
          placeholder={hint.placeholder}
          helperText={hint.help}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          required
        />

        {livePii.length > 0 ? (
          <Alert severity="warning" role="status" sx={{ py: 0.5 }}>
            Looks like your input includes {labelList(livePii)}. We&apos;ll remove{' '}
            {livePii.length > 1 ? 'these' : 'it'} before the AI sees{' '}
            {livePii.length > 1 ? 'them' : 'it'} — you can choose to keep{' '}
            {livePii.length > 1 ? 'any' : 'it'} after running.
          </Alert>
        ) : null}

        {coaching.length > 0 ? (
          <CoachingPanel
            nudges={coaching}
            onUseSaferWay={(text) => setInput(text)}
            onDismiss={(id) => setDismissedCoaching((d) => [...d, id])}
          />
        ) : null}

        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => run([])}
            disabled={isPending || !input.trim()}
          >
            {isPending ? 'Running…' : 'Run Skill'}
          </Button>
        </Box>
      </Paper>

      {result ? (
        <RunResultView result={result} isPending={isPending} onKeepRerun={(keep) => run(keep)} />
      ) : null}
    </Box>
  );
}

/**
 * In-context guidance (Epic 3 "Surface the applicable rule in-context"): the active-policy rules
 * that apply to this Skill, in plain language with their source citation. Display-only — the run
 * always applies the full policy via inheritance; this just shows the Doer the relevant guardrails
 * without opening a separate policy doc.
 */
function ApplicableRulesPanel({ rules }: { rules: RuleGuidance[] }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'action.hover' }}
    >
      <Typography variant="subtitle1" component="h2">
        Rules that apply here
      </Typography>
      <Box
        component="ul"
        sx={{ m: 0, pl: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        {rules.map((rule, i) => (
          <Box component="li" key={i}>
            <Typography variant="body2">{rule.ruleText}</Typography>
            {rule.citation ? (
              <Typography variant="caption" color="text.secondary">
                Source: {rule.citation}
              </Typography>
            ) : null}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function labelList(findings: { label: string; count: number }[]): string {
  return findings.map((f) => (f.count > 1 ? `${f.count} ${f.label}s` : f.label)).join(', ');
}

/**
 * In-the-moment coaching (Epic 6). For each risk pattern in the live input, a kind heads-up (guide,
 * not scold) with a concrete safer way the Doer can apply — which rewrites the input to a safe task —
 * or dismiss, which hides it and doesn't nag again this session. Display-only; the server-side
 * guardrails still run regardless of what the Doer does here.
 */
function CoachingPanel({
  nudges,
  onUseSaferWay,
  onDismiss,
}: {
  nudges: CoachingNudge[];
  onUseSaferWay: (text: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {nudges.map((n) => {
        const rewrite = n.saferRewrite;
        return (
          <Alert key={n.id} severity="info" role="status">
            <Typography variant="body2">{n.message}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              {rewrite ? (
                <Button size="small" variant="outlined" onClick={() => onUseSaferWay(rewrite)}>
                  Use the safer way
                </Button>
              ) : null}
              <Button size="small" color="inherit" onClick={() => onDismiss(n.id)}>
                Dismiss
              </Button>
            </Box>
          </Alert>
        );
      })}
    </Box>
  );
}

function RunResultView({
  result,
  isPending,
  onKeepRerun,
}: {
  result: RunResult;
  isPending: boolean;
  onKeepRerun: (keep: PiiCategory[]) => void;
}) {
  if (result.status === 'blocked') {
    return (
      <Alert severity="error" role="status">
        {result.message}
      </Alert>
    );
  }

  const chip = STATUS_CHIP[result.status];

  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="h2">
          Draft
        </Typography>
        <Chip size="small" color={chip.color} label={chip.label} />
      </Box>

      {result.status === 'needs_review' ? (
        <Alert severity="warning" role="status">
          {result.guardrail.reason} A person needs to approve this before it&apos;s used — decide
          below, or from <strong>Approvals</strong>.
        </Alert>
      ) : null}

      {result.pii.length > 0 ? (
        <PiiPanel result={result} isPending={isPending} onKeepRerun={onKeepRerun} />
      ) : null}

      <Typography
        variant="body1"
        component="p"
        sx={{ whiteSpace: 'pre-wrap', bgcolor: 'background.default', p: 2, borderRadius: 1 }}
      >
        {result.output}
      </Typography>

      <Typography variant="caption" color="text.secondary">
        {result.provenanceLabel} · You decide before this is used.
      </Typography>

      {result.status === 'needs_review' ? (
        <Box sx={{ mt: 1 }}>
          <ReviewActions taskRunId={result.taskRunId} output={result.output} />
        </Box>
      ) : null}
    </Paper>
  );
}

/**
 * Personal-information panel: what was stripped by default, and a per-category "keep and re-run"
 * override (Epic 5 "Allow deliberate keep"). Keeping an item re-runs with it in the input and the
 * pipeline logs the choice. Categories already kept this run are shown as such.
 */
function PiiPanel({
  result,
  isPending,
  onKeepRerun,
}: {
  result: Extract<RunResult, { status: 'completed' | 'needs_review' }>;
  isPending: boolean;
  onKeepRerun: (keep: PiiCategory[]) => void;
}) {
  const [selected, setSelected] = useState<PiiCategory[]>([]);
  const stripped = result.pii.filter((p) => !result.piiKept.includes(p.category));
  const kept = result.pii.filter((p) => result.piiKept.includes(p.category));

  const toggle = (c: PiiCategory) =>
    setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  return (
    <Alert severity="info" icon={false} role="status">
      {stripped.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2">
            Personal information was removed before the AI saw it: {labelList(stripped)}.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Need any of it in the note? Keep it and re-run — your choice is recorded.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {stripped.map((f) => (
              <FormControlLabel
                key={f.category}
                control={
                  <Checkbox
                    size="small"
                    checked={selected.includes(f.category)}
                    onChange={() => toggle(f.category)}
                  />
                }
                label={`Keep the ${f.label}`}
              />
            ))}
          </Box>
          <Box>
            <Button
              size="small"
              variant="outlined"
              disabled={isPending || selected.length === 0}
              onClick={() => onKeepRerun([...result.piiKept, ...selected])}
            >
              {isPending ? 'Re-running…' : 'Re-run keeping selected'}
            </Button>
          </Box>
        </Box>
      ) : null}

      {kept.length > 0 ? (
        <Typography variant="body2" sx={{ mt: stripped.length > 0 ? 1.5 : 0 }}>
          Kept in your input by your choice: {labelList(kept)}.
        </Typography>
      ) : null}
    </Alert>
  );
}
