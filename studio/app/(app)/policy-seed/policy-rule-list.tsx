import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { NewPolicyRule } from '@/lib/data/policy';

/**
 * Presentational list of policy rules in the plain-language rule format
 * (docs/specs/epic-1-plain-language-rule-format.md). Pure display: no logic, no data access.
 * Each rule shows its one-sentence text, a locked marker on baseline-safety rules, a
 * needs-review badge, its origin label, and its provenance line.
 */

const ORIGIN_LABEL: Record<NewPolicyRule['origin'], string> = {
  standard: 'Seeded from a standard',
  baseline: 'Always-on safety baseline',
  custom: 'Added by your team',
};

export default function PolicyRuleList({ rules }: { rules: NewPolicyRule[] }) {
  return (
    <Box
      component="ul"
      sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      {rules.map((rule, i) => (
        <Paper
          key={i}
          component="li"
          variant="outlined"
          sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
        >
          <Typography variant="body1">{rule.ruleText}</Typography>

          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
            {rule.isBaselineSafety ? (
              <Chip size="small" color="default" label="🔒 Locked — can't be turned off" />
            ) : null}
            {rule.needsReview ? <Chip size="small" color="warning" label="Needs review" /> : null}
            <Chip size="small" variant="outlined" label={ORIGIN_LABEL[rule.origin]} />
          </Box>

          {rule.citation ? (
            <Typography variant="caption" color="text.secondary">
              Based on {rule.citation}
            </Typography>
          ) : null}
        </Paper>
      ))}
    </Box>
  );
}
