import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import { getMyProfile } from '@/lib/data/profile';
import { getMyOrgId } from '@/lib/data/runs';
import { getActivePolicy } from '@/lib/data/policy';
import { countOrgRuns } from '@/lib/data/usage';
import { setupProgress, type SetupStepKey } from '@/lib/domain/setup';
import { skipSetup } from './actions';

/**
 * Self-serve setup hub (Presentation layer, ADR-0003) — Epic 8, "Build self-serve setup (no
 * consultant)". A first-time Accountable Leader sees three plain steps with visible progress:
 * their organization → set their AI rules → run their first Skill.
 *
 * A pure view: the page reads facts through existing `lib/data` accessors and lets
 * `setupProgress()` (Domain) decide what is done and what is next. The steps themselves happen on
 * their own screens (/policy-seed, /skills); this page only links into them. The session guard,
 * <main> landmark, and nav come from the shared app shell.
 *
 * Progress is worked out from the database on every visit, so a leader who leaves and comes back
 * — on any device — lands on the step they have not finished yet.
 */

type StepCopy = {
  title: string;
  description: (orgName: string | null) => string;
  /** Where the step happens. The organization step is confirmation only, so it has none. */
  action?: { href: string; label: string };
};

const STEP_COPY: Record<SetupStepKey, StepCopy> = {
  organization: {
    title: 'Your organization',
    description: (orgName) =>
      orgName
        ? `${orgName} was set up when you signed up. You're its Accountable Leader — the person who sets your AI rules.`
        : "We couldn't load your organization's name just now. You can carry on with the next steps.",
  },
  rules: {
    title: 'Set your AI rules',
    description: () =>
      "Answer a few plain questions about how your organization uses AI. We'll build a starter policy from recognized standards for you to review and turn on. About five minutes.",
    action: { href: '/policy-seed', label: 'Set your AI rules' },
  },
  first_run: {
    title: 'Run your first Skill',
    description: () =>
      'Try the starter Skill, "Draft a thank-you". Every run goes through the safety checks, and you review the draft before you use it.',
    action: { href: '/skills', label: 'Run your first Skill' },
  },
};

export default async function SetupPage() {
  const profile = await getMyProfile();

  // Setup is the Accountable Leader's job. Anyone else gets a way forward, not a dead end.
  if (profile?.role !== 'accountable_leader') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h4" component="h1">
          Get set up
        </Typography>
        <Alert severity="info">
          Your organization&apos;s Accountable Leader handles setup. You can start running Skills
          right away.
        </Alert>
        <Box>
          <Button variant="contained" component={NextLink} href="/skills">
            Open Skills
          </Button>
        </Box>
      </Box>
    );
  }

  const orgId = await getMyOrgId();
  const [activePolicy, runCount] = await Promise.all([
    orgId ? getActivePolicy(orgId) : Promise.resolve(null),
    countOrgRuns(),
  ]);

  // countOrgRuns returns null on a failed read. Show an error rather than claiming "no runs yet".
  if (runCount === null) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h4" component="h1">
          Get set up
        </Typography>
        <Alert severity="error">
          We couldn&apos;t load your setup progress just now. Refresh the page to try again, or{' '}
          <Link component={NextLink} href="/dashboard">
            go to Home
          </Link>
          .
        </Alert>
      </Box>
    );
  }

  const orgName = profile.org?.name ?? null;
  const progress = setupProgress({ orgName, hasActivePolicy: activePolicy !== null, runCount });
  const percent = Math.round((progress.doneCount / progress.total) * 100);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Get set up
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Three short steps to your first safe AI result. No technical help needed — you can stop
          any time and pick up where you left off.
        </Typography>
      </Box>

      <Box>
        <Typography id="setup-progress-label" variant="body2" sx={{ mb: 1 }}>
          {progress.doneCount} of {progress.total} steps done
        </Typography>
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-labelledby="setup-progress-label"
        />
      </Box>

      {progress.isComplete ? (
        <Alert severity="success">
          You&apos;re set up. Your rules are active and your first Skill has run.{' '}
          <Link component={NextLink} href="/dashboard">
            Go to Home
          </Link>
        </Alert>
      ) : null}

      <Box
        component="ol"
        sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {progress.steps.map((step, index) => {
          const copy = STEP_COPY[step.key];
          const isNext = step.key === progress.nextStep;
          const statusLabel = step.done ? 'Done' : isNext ? 'Up next' : 'Not started';
          return (
            <Paper
              key={step.key}
              component="li"
              variant="outlined"
              aria-current={isNext ? 'step' : undefined}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                borderColor: isNext ? 'primary.main' : undefined,
                borderWidth: isNext ? 2 : 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h2">
                  Step {index + 1}: {copy.title}
                </Typography>
                <Chip
                  size="small"
                  label={statusLabel}
                  color={step.done ? 'success' : isNext ? 'primary' : 'default'}
                  variant={step.done || isNext ? 'filled' : 'outlined'}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {copy.description(orgName)}
              </Typography>
              {/* The step you're on gets the one prominent button; a step you haven't reached
                  yet stays reachable (no hard lock); a finished step needs no action. */}
              {copy.action && !step.done ? (
                <Box>
                  <Button
                    variant={isNext ? 'contained' : 'outlined'}
                    component={NextLink}
                    href={copy.action.href}
                  >
                    {copy.action.label}
                  </Button>
                </Box>
              ) : null}
            </Paper>
          );
        })}
      </Box>

      {!progress.isComplete ? (
        // A form, not a link: skipping records the choice for this session so Home does not send
        // the leader straight back here (no redirect loop).
        <Box component="form" action={skipSetup}>
          <Button type="submit" variant="text" sx={{ px: 0 }}>
            Skip for now — go to Home
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
