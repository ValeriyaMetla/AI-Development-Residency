import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { DemoRun } from '@/lib/demo/demo-run';
import type { DemoRecordLine } from '@/lib/demo/demo-views';
import type { PolicyDocument } from '@/lib/domain/policy-document';
import { DEMO_VIEWS_COPY } from './demo-content';

/**
 * The demo's read-only sections (ADR-0029 T6): the policy, the run waiting for review, and the
 * record. Server components, presentation only: the page builds every value with the real Domain
 * code (`lib/demo/demo-views.ts`) and passes finished data here. No forms, no server actions.
 *
 * Accessibility + UX notes:
 * - Each section has an <h2>; sub-parts use <h3>/<h4> in order.
 * - "Required" is written as text, never shown by color alone.
 * - The review controls are disabled and described by a visible note that says why, so the
 *   inactive state is explained to everyone, not just greyed out (ADR-0029 point 6).
 * - The review section can take focus, so the "See it waiting for review below" link lands there.
 */

const COPY = DEMO_VIEWS_COPY;

export function DemoPolicy({ doc }: { doc: PolicyDocument }) {
  return (
    <Box component="section" aria-labelledby="demo-policy-heading">
      <Typography id="demo-policy-heading" variant="h5" component="h2" sx={{ fontWeight: 700 }}>
        {COPY.policy.heading}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 3 }}>
        {COPY.policy.intro}
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
          {doc.title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {doc.status} · {doc.versionLabel}
        </Typography>

        {doc.sections.map((section) => (
          <Box key={section.number} sx={{ mt: 3 }}>
            <Typography variant="subtitle1" component="h4" sx={{ fontWeight: 700 }}>
              {section.number}. {section.heading}
            </Typography>
            {section.intro && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {section.intro}
              </Typography>
            )}
            {section.clauses.length > 0 && (
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 1 }}>
                {section.clauses.map((clause) => (
                  <Box component="li" key={clause.number} sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, minWidth: '2.25rem' }}>
                      {clause.number}
                    </Typography>
                    <Typography variant="body2">
                      {clause.text}
                      {clause.refs.length > 0 && (
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          {' '}
                          [{clause.refs.join(', ')}]
                        </Box>
                      )}
                      {clause.required && (
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            px: 0.75,
                            py: 0.25,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {COPY.policy.required}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            {section.paragraphs.map((p) => (
              <Typography key={p} variant="body2" sx={{ mt: 1 }}>
                {p}
              </Typography>
            ))}
          </Box>
        ))}

        {doc.references.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" component="h4" sx={{ fontWeight: 700 }}>
              {COPY.policy.references}
            </Typography>
            <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, mt: 1 }}>
              {doc.references.map((ref) => (
                <Typography component="li" variant="body2" key={ref.number} sx={{ mt: 0.5 }}>
                  [{ref.number}] {ref.citation}
                </Typography>
              ))}
            </Box>
          </Box>
        )}

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 3, fontStyle: 'italic' }}>
          {doc.generatedNote}
        </Typography>
      </Paper>
    </Box>
  );
}

export function DemoReview({ run }: { run: DemoRun }) {
  return (
    <Box
      component="section"
      id="demo-review"
      tabIndex={-1}
      aria-labelledby="demo-review-heading"
      sx={{ outline: 'none', scrollMarginTop: 16 }}
    >
      <Typography id="demo-review-heading" variant="h5" component="h2" sx={{ fontWeight: 700 }}>
        {COPY.review.heading}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 3 }}>
        {COPY.review.intro}
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
          {run.preset.label}
        </Typography>

        <Paper
          variant="outlined"
          sx={{ p: 2, mt: 2, bgcolor: 'background.default', wordBreak: 'break-word' }}
        >
          <Typography variant="body2">{run.draft.text}</Typography>
        </Paper>
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
          {run.draft.label}
        </Typography>

        <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 700, mt: 2 }}>
          {COPY.review.flaggedBecause}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {run.ruleCheck.reason}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            disabled
            control={<Checkbox slotProps={{ input: { 'aria-describedby': 'demo-review-note' } }} />}
            label={COPY.review.acknowledge}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" disabled aria-describedby="demo-review-note">
              {COPY.review.approve}
            </Button>
            <Button variant="outlined" disabled aria-describedby="demo-review-note">
              {COPY.review.reject}
            </Button>
          </Box>
          <Typography id="demo-review-note" variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
            {COPY.review.inactiveNote}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export function DemoRecord({ lines }: { lines: DemoRecordLine[] }) {
  return (
    <Box component="section" aria-labelledby="demo-record-heading">
      <Typography id="demo-record-heading" variant="h5" component="h2" sx={{ fontWeight: 700 }}>
        {COPY.record.heading}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 3 }}>
        {COPY.record.intro}
      </Typography>

      <Paper variant="outlined">
        <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {lines.map((line, i) => (
            <Box
              component="li"
              key={line.id}
              sx={{
                px: { xs: 2, sm: 3 },
                py: 1.5,
                borderTop: i === 0 ? 0 : 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {line.wording}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                <time dateTime={line.at}>{line.dateLabel}</time> ·{' '}
                {line.runLabel ?? COPY.record.orgWide}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
