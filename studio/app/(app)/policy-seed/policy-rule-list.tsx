import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { NewPolicyRule } from '@/lib/data/policy';
import { showsNeedsReview } from '@/lib/domain/policy-review-labels';

/**
 * Presentational list of policy rules in the plain-language rule format
 * (docs/specs/epic-1-plain-language-rule-format.md). Pure display: no logic, no data access.
 * Each rule shows its one-sentence text, a safety-floor marker on baseline-safety rules, a
 * needs-review badge (only where the Leader can act on it — `showsNeedsReview`), its origin label,
 * and its provenance line. `RuleTagKey` explains the tags in words.
 */

/** The label on a locked baseline-safety rule (shared with the rule editor). */
export const SAFETY_FLOOR_LABEL = '🔒 Safety floor — always on';

const ORIGIN_LABEL: Record<NewPolicyRule['origin'], string> = {
  standard: 'Seeded from a standard',
  baseline: 'Always-on safety baseline',
  custom: 'Added by your team',
  suggested: 'Suggested from your usage', // reserved by the rule-format spec; ADR-0025
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
              <Chip size="small" color="default" label={SAFETY_FLOOR_LABEL} />
            ) : null}
            {showsNeedsReview(rule) ? (
              <Chip size="small" color="warning" label="Needs review" />
            ) : null}
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

/**
 * A plain key to the tags on the review screen, so they mean something before activation (when
 * nothing on the list is clickable). Meaning is in words, never color alone (WCAG 2.2 AA).
 */
export function RuleTagKey({ showNeedsReview }: { showNeedsReview: boolean }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 1.5,
        rowGap: 1,
        alignItems: 'center',
      }}
    >
      <Box component="dt">
        <Chip size="small" color="default" label={SAFETY_FLOOR_LABEL} />
      </Box>
      <Typography component="dd" variant="body2" sx={{ m: 0 }}>
        Part of every policy to keep people safe. It can&apos;t be edited or turned off.
      </Typography>
      {showNeedsReview ? (
        <>
          <Box component="dt">
            <Chip size="small" color="warning" label="Needs review" />
          </Box>
          <Typography component="dd" variant="body2" sx={{ m: 0 }}>
            We filled this in from a default answer. Check it fits your organization — you can edit
            it after you activate, under Your rules.
          </Typography>
        </>
      ) : null}
    </Box>
  );
}
