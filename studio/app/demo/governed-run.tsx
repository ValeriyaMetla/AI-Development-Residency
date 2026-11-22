'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { DemoRun } from '@/lib/demo/demo-run';
import { DEMO_RUN_COPY } from './demo-content';

/**
 * The demo's governed run (ADR-0029 T5). Presentation only: every result was worked out on the
 * server by the real safety code (`allDemoRuns`); this component only remembers which preset is
 * picked and shows that finished result. It decides nothing (ADR-0003, the Leak Test).
 *
 * Accessibility + UX notes:
 * - Native radio buttons in a labelled group: Tab reaches the group, arrow keys change the preset.
 *   No free-text input anywhere (ADR-0029 point 4).
 * - The first preset is picked on load, so the steps are visible without a click.
 * - The steps are a numbered list with plain headings, in the order the product runs them.
 * - The outcome is text plus an icon, never color alone; text stays `text.primary` for contrast.
 * - On a change, a short polite announcement names the new outcome. It doesn't re-read every step
 *   and doesn't move focus, so the visitor stays on the picker.
 */

// Screen-reader-only. Pixel values are strings on purpose: in MUI `sx`, a bare `1` means 100%
// width and `m: -1` means one spacing unit (-8px), which made the page scroll sideways on phones.
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
  padding: 0,
  margin: '-1px',
} as const;

function OutcomeIcon({ status }: { status: DemoRun['outcome']['status'] }) {
  const path =
    status === 'completed'
      ? 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z' // check
      : 'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z'; // flag
  return (
    <Box
      component="svg"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      sx={{
        width: 20,
        height: 20,
        flexShrink: 0,
        color: status === 'completed' ? 'success.main' : 'warning.dark',
      }}
    >
      <path fill="currentColor" d={path} />
    </Box>
  );
}

function Step({
  number,
  heading,
  children,
}: {
  number: number;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Box component="li" sx={{ display: 'flex', gap: 2 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        {number}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          {heading}
        </Typography>
        <Box sx={{ mt: 1 }}>{children}</Box>
      </Box>
    </Box>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, bgcolor: 'background.default', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      <Typography variant="body2">{children}</Typography>
    </Paper>
  );
}

export function GovernedRun({ runs }: { runs: DemoRun[] }) {
  const [selectedId, setSelectedId] = React.useState(runs[0]?.preset.id ?? '');
  const [announcement, setAnnouncement] = React.useState('');
  const run = runs.find((r) => r.preset.id === selectedId) ?? runs[0];
  if (!run) return null;

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = runs.find((r) => r.preset.id === event.target.value);
    if (!next) return;
    setSelectedId(next.preset.id);
    setAnnouncement(`${next.preset.label}: ${next.outcome.label}`);
  };

  return (
    <Box>
      <FormControl>
        <FormLabel id="demo-preset-label" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {DEMO_RUN_COPY.pickerLabel}
        </FormLabel>
        <RadioGroup
          aria-labelledby="demo-preset-label"
          name="demo-preset"
          value={run.preset.id}
          onChange={onChange}
        >
          {runs.map((r) => (
            <FormControlLabel
              key={r.preset.id}
              value={r.preset.id}
              control={<Radio />}
              label={r.preset.label}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <Box role="status" aria-live="polite" sx={visuallyHidden}>
        {announcement}
      </Box>

      <Box
        component="ol"
        aria-label={`${DEMO_RUN_COPY.stepsLabel}: ${run.preset.label}`}
        sx={{ listStyle: 'none', p: 0, m: 0, mt: 4, display: 'grid', gap: 4 }}
      >
        <Step number={1} heading={DEMO_RUN_COPY.steps.request}>
          <Quote>{run.preset.request}</Quote>
        </Step>

        <Step number={2} heading={DEMO_RUN_COPY.steps.pii}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {DEMO_RUN_COPY.piiFoundHeading}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {run.pii.summary}
          </Typography>
          <Quote>{run.pii.redactedRequest}</Quote>
        </Step>

        <Step number={3} heading={DEMO_RUN_COPY.steps.draft}>
          <Quote>{run.draft.text}</Quote>
          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
            {run.draft.label}
          </Typography>
        </Step>

        <Step number={4} heading={DEMO_RUN_COPY.steps.ruleCheck}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {run.ruleCheck.reason}
          </Typography>
          <Box
            sx={{
              mt: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              bgcolor: (theme) =>
                alpha(
                  run.outcome.status === 'completed'
                    ? theme.palette.success.main
                    : theme.palette.warning.main,
                  0.14,
                ),
            }}
          >
            <OutcomeIcon status={run.outcome.status} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {DEMO_RUN_COPY.outcomePrefix} {run.outcome.label}
            </Typography>
          </Box>
        </Step>
      </Box>
    </Box>
  );
}
