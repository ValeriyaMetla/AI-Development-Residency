import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { getMyOrgId } from '@/lib/data/runs';
import { getMyProfile } from '@/lib/data/profile';
import { getActivePolicy, getPolicyRulesOrNull } from '@/lib/data/policy';
import PolicySeedWizard from './policy-seed-wizard';
import PolicyRuleList from './policy-rule-list';
import PolicyEditor from './policy-editor';
import RuleSuggestions from './rule-suggestions';
import PolicyPortability from './policy-portability';
import { getRuleSuggestions } from '@/lib/domain/rule-suggestion-service';

/**
 * "Your rules" route (Presentation layer). Branches on whether the org has an active policy
 * (ADR-0024): with one, it shows the rule editor to an Accountable Leader and a read-only view to
 * anyone else (transparency); with none, it shows the ~5-min seed wizard. The session guard,
 * <main> landmark, and nav come from the shared app shell. Data access stays in lib/data accessors.
 */
export default async function PolicySeedPage() {
  const orgId = await getMyOrgId();
  const activePolicy = orgId ? await getActivePolicy(orgId) : null;

  // No active policy yet → the guided seed wizard (first-time setup).
  if (!activePolicy) {
    // Pre-fills the accountable person for the "use recommended answers" fast path.
    const profile = await getMyProfile();
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Set your AI rules
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Answer a few plain questions and we&apos;ll draft a starter AI policy for your
            organization — grounded in recognized standards. Takes about five minutes.
          </Typography>
        </Box>
        <PolicySeedWizard defaultLeaderName={profile?.display_name ?? ''} />
      </Box>
    );
  }

  const [profile, rules] = await Promise.all([
    getMyProfile(),
    getPolicyRulesOrNull(activePolicy.id),
  ]);
  const canEdit = profile?.role === 'accountable_leader';
  // Rule suggestions are a Leader-only view (ADR-0025); the accept/dismiss actions re-check the role.
  const suggestions = canEdit && orgId ? await getRuleSuggestions(orgId) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Your AI rules
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {canEdit
            ? 'Edit your rules in plain language and publish when you’re ready. Changes apply to the next task automatically.'
            : 'Your organization’s AI rules, in plain language. Every governed task is checked against these.'}
        </Typography>
      </Box>

      {suggestions ? (
        <RuleSuggestions
          unavailable={suggestions.status === 'unavailable'}
          suggestions={
            suggestions.status === 'ok'
              ? suggestions.suggestions.map((s) => ({
                  key: s.key,
                  ruleText: s.ruleText,
                  citation: s.citation,
                  evidenceLabel: s.evidenceLabel,
                }))
              : []
          }
        />
      ) : null}

      {rules === null ? (
        // A failed read must never look like an empty policy, and the editor is hidden so nobody can
        // publish a new version from a blank screen.
        <Alert severity="error" role="status">
          We couldn&apos;t load your rules right now. Nothing has changed — please refresh in a
          moment.
        </Alert>
      ) : rules.length === 0 ? (
        <Alert severity="info">This policy has no rules yet.</Alert>
      ) : canEdit ? (
        <PolicyEditor
          // Re-mount on each published version so the editor never holds a prior version's rule
          // ids (a publish or an accepted suggestion creates new ids — ADR-0024).
          key={activePolicy.id}
          rules={rules.map((r) => ({
            id: r.id,
            ruleText: r.ruleText,
            isBaselineSafety: r.isBaselineSafety,
            citation: r.citation,
          }))}
        />
      ) : (
        <PolicyRuleList rules={rules} />
      )}

      {/* Own-your-rules portability (Epic 1): export/import is a Leader action; shown once a policy exists. */}
      {canEdit && rules && rules.length > 0 ? <PolicyPortability /> : null}
    </Box>
  );
}
