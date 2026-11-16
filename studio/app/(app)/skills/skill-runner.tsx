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
import { runSkill } from './actions';
import type { RunnableSkill } from '@/lib/data/runs';
import type { RunResult } from '@/lib/domain/pipeline';

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

export default function SkillRunner({ skills }: { skills: RunnableSkill[] }) {
  const [skillKey, setSkillKey] = useState(skills[0]?.key ?? '');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [isPending, startTransition] = useTransition();

  if (skills.length === 0) {
    return <Alert severity="info">No Skills are available to run yet.</Alert>;
  }

  const hint = INPUT_HINTS[skillKey] ?? DEFAULT_HINT;
  const multiple = skills.length > 1;

  function handleRun() {
    setResult(null);
    startTransition(async () => {
      setResult(await runSkill(skillKey, input));
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={handleRun}
            disabled={isPending || !input.trim()}
          >
            {isPending ? 'Running…' : 'Run Skill'}
          </Button>
        </Box>
      </Paper>

      {result ? <RunResultView result={result} /> : null}
    </Box>
  );
}

function RunResultView({ result }: { result: RunResult }) {
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
          {result.guardrail.reason}
        </Alert>
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
    </Paper>
  );
}
