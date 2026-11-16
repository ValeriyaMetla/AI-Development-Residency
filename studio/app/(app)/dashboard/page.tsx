import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import NextLink from 'next/link';
import { getMyProfile } from '@/lib/data/profile';
import { getMyOrgId } from '@/lib/data/runs';
import { getActivePolicy } from '@/lib/data/policy';

/**
 * Home (Presentation layer, ADR-0003). Renders inside the shared app shell
 * (app/(app)/layout.tsx), which provides the <main> landmark, navigation, and the
 * account/sign-out menu — so this page is just the page's own content.
 */
export default async function DashboardPage() {
  const profile = await getMyProfile();
  const orgId = await getMyOrgId();
  const activePolicy = orgId ? await getActivePolicy(orgId) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1">
          Home
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {profile?.org?.name ? `${profile.org.name} — ` : ''}your governed AI workspace.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" component="h2">
            Your AI rules
          </Typography>
          {activePolicy ? <Chip size="small" color="success" label="Active" /> : null}
        </Box>
        {activePolicy ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Your organization has an active AI policy. It applies to AI use across the Studio.
            </Typography>
            <Box>
              <Button variant="outlined" component={NextLink} href="/policy-seed">
                Review or update your rules
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Set your organization&apos;s AI rules once. Answer a few plain questions and
              we&apos;ll draft a starter policy grounded in recognized standards — about five
              minutes.
            </Typography>
            <Box>
              <Button variant="contained" component={NextLink} href="/policy-seed">
                Set your AI rules
              </Button>
            </Box>
          </>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h6" component="h2">
          Governance Co-Pilot
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Not sure whether to use AI for something? Describe the use and get a clear recommendation
          — grounded in recognized standards and your policy. The Co-Pilot advises; you decide.
        </Typography>
        <Box>
          <Button variant="contained" component={NextLink} href="/copilot">
            Should we use AI for this?
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h6" component="h2">
          Run a Skill
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Draft an everyday task — like a donor thank-you — as a governed Skill. Every run is
          checked against your policy and recorded, and you review the draft before using it.
        </Typography>
        <Box>
          <Button variant="contained" component={NextLink} href="/skills">
            Open Skills
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
