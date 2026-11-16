import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { listRunnableSkills, getMyOrgId } from '@/lib/data/runs';
import { getActivePolicy, getPolicyRules } from '@/lib/data/policy';
import SkillRunner from './skill-runner';

/**
 * Skill runner route (Presentation layer, Epic 3). Lists the org's governed Skills and hosts the
 * run form. The session guard, <main> landmark, and navigation come from the shared app shell. A
 * pure view — all governance runs through runGovernedSkill() via the Service action (ADR-0003).
 *
 * No active policy still runs, on baseline safety, with disclosure (ADR-0018) — never a hard block.
 */
export default async function SkillsPage() {
  const skills = await listRunnableSkills();
  const orgId = await getMyOrgId();
  const activePolicy = orgId ? await getActivePolicy(orgId) : null;
  const policyRules = activePolicy ? await getPolicyRules(activePolicy.id) : [];
  // Display-only guidance: plain rule text + its snapshotted source citation (ADR-0009).
  const ruleGuidance = policyRules.map((r) => ({
    ruleText: r.ruleText,
    category: r.category,
    citation: r.citation,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Skills
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Run an everyday task as a governed Skill. Every run is checked against your policy and
          recorded — you always see a draft to review before you use it.
        </Typography>
      </Box>

      {!activePolicy ? (
        <Alert severity="info">
          No active policy yet — runs still go through the safety net on{' '}
          <strong>baseline safety</strong>.{' '}
          <Link component={NextLink} href="/policy-seed">
            Set your rules
          </Link>{' '}
          for fuller, organization-specific protection.
        </Alert>
      ) : null}

      <SkillRunner skills={skills} policyRules={ruleGuidance} />
    </Box>
  );
}
