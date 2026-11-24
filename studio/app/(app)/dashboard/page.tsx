import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import NextLink from 'next/link';
import { redirect } from 'next/navigation';
import { getMyProfile } from '@/lib/data/profile';
import { countPendingReviews, getMyOrgId } from '@/lib/data/runs';
import { getActivePolicy } from '@/lib/data/policy';
import { countOrgRuns, getMyRunEntries, type MyRunEntry } from '@/lib/data/usage';
import { hasSkippedSetupThisSession } from '@/lib/data/setup-skip';
import { outcomeLabel } from '@/lib/domain/usage';
import { setupProgress, shouldRouteToSetup } from '@/lib/domain/setup';
import { waitingHeadline, type PendingReviewsSummary } from '@/lib/domain/review-waiting';

/**
 * Home (Presentation layer, ADR-0003). Renders inside the shared app shell
 * (app/(app)/layout.tsx), which provides the <main> landmark, navigation, and the account menu.
 *
 * Role-aware (Epic 3): the primary cards are ordered by profile.role — a Leader leads with their
 * rules + the Co-Pilot; a Doer leads with running a Skill + recent activity. Presentation-only: the
 * role comes from the existing getMyProfile(); no governance logic and no new data access here
 * (ADR-0003 Leak Test). An unknown/missing role falls back to a minimal, safe home — no admin cards.
 */
export default async function DashboardPage() {
  const profile = await getMyProfile();
  const orgId = await getMyOrgId();
  const activePolicy = orgId ? await getActivePolicy(orgId) : null;

  const role = profile?.role;
  const isLeader = role === 'accountable_leader';
  const isDoer = role === 'frontline_doer';

  // First-run routing (Epic 8, Lane D): a leader with unfinished setup is sent to /setup, unless
  // they chose "Skip for now" this browser session. Signup and login both land here, so this one
  // check covers first sign-up and later logins. The decision is the Domain's (shouldRouteToSetup);
  // a failed run-count read (null) never redirects.
  if (isLeader) {
    const runCount = await countOrgRuns();
    const progress =
      runCount === null
        ? null
        : setupProgress({
            orgName: profile?.org?.name ?? null,
            hasActivePolicy: activePolicy !== null,
            runCount,
          });
    if (
      shouldRouteToSetup({
        role,
        progress,
        skippedThisSession: await hasSkippedSetupThisSession(),
      })
    ) {
      redirect('/setup');
    }
  }

  // Recent-activity feed is a Doer card (Chunk 3 wire-up): fetch only for a Doer, and only the few
  // most recent. getMyRunEntries is Lane B's existing read accessor (run_by = me, non-sensitive);
  // null = failed to load (error state), [] = no runs yet (empty state) — the two must differ.
  const recentRuns = isDoer ? await getMyRunEntries(5) : null;

  // Waiting-for-review count (card "Tell leaders when something is waiting for their review"):
  // shown to everyone who can review. null = couldn't read it → the line is simply left out.
  const pending = await countPendingReviews();

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

      {pending ? <WaitingForReview pending={pending} /> : null}

      {isDoer ? (
        <>
          <RunSkillCard />
          <RecentActivityCard runs={recentRuns} />
          <CopilotCard />
        </>
      ) : isLeader ? (
        <>
          <RunSkillCard />
          <GovernanceFlow
            hasActivePolicy={activePolicy !== null}
            pendingReviews={pending?.count ?? null}
          />
        </>
      ) : (
        // Unknown / missing role — minimal safe home, no rules-admin surfaced.
        <>
          <RunSkillCard />
          <CopilotCard />
        </>
      )}
    </Box>
  );
}

/**
 * The governance lifecycle on the Leader's home (wireframe §4): a numbered, top-down path that
 * mirrors the "Your AI Governance" nav menu — decide → set the rules → review → monitor → prove.
 * Presentation-only: static links into the existing areas (routes unchanged); step 2 reflects
 * whether a policy is active. "Run a Skill" stays its own primary action above this.
 *
 * Accessibility: a real <ol> so the sequence + length are announced; the number badge is decorative
 * (aria-hidden) and the meaning lives in the step heading (<h3>) under the section <h2>.
 */
function GovernanceFlow({
  hasActivePolicy,
  pendingReviews,
}: {
  hasActivePolicy: boolean;
  /** Runs waiting for review; null when the count couldn't be read (then the step says nothing). */
  pendingReviews: number | null;
}) {
  const steps: { title: string; body: string; href: string; cta: string }[] = [
    {
      title: 'Decide',
      body: 'Not sure whether to use AI for something? Ask the Co-Pilot for a grounded recommendation.',
      href: '/copilot',
      cta: 'Ask the Co-Pilot',
    },
    {
      title: 'Set the rules',
      body: hasActivePolicy
        ? 'Your AI policy is active and applies across the Studio. Review or update it anytime.'
        : 'Set your organization’s AI rules once — a starter policy grounded in recognized standards, in about five minutes.',
      href: '/policy-seed',
      cta: hasActivePolicy ? 'AI Policy' : 'Set your AI rules',
    },
    {
      title: 'Review',
      body:
        pendingReviews === null || pendingReviews === 0
          ? 'Approve anything the safety net flags for a person before it’s used.'
          : `${pendingReviews} waiting for your review now. Approve anything the safety net flags for a person before it’s used.`,
      href: '/approvals',
      cta: 'Human Review',
    },
    {
      title: 'Monitor',
      body: 'See how AI is being used across your organization, in plain language.',
      href: '/dashboard/usage',
      cta: 'Monitoring',
    },
    {
      title: 'Prove',
      body: 'A responsible-AI record you can show funders and your board.',
      href: '/report',
      cta: 'Audit Trail',
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="h2">
          Your AI governance
        </Typography>
        <Chip
          size="small"
          color={hasActivePolicy ? 'success' : 'warning'}
          label={hasActivePolicy ? 'Policy active' : 'No policy yet'}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Five steps, from deciding to proving — the lifecycle your Studio runs on.
      </Typography>

      <Box
        component="ol"
        sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
          mt: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {steps.map((step, i) => (
          <Box
            component="li"
            key={step.title}
            sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'flex-start' }}
          >
            <Box
              aria-hidden="true"
              sx={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}
            >
              {i + 1}
            </Box>
            <Box>
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
                {step.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {step.body}
              </Typography>
              <Button
                variant="text"
                size="small"
                component={NextLink}
                href={step.href}
                sx={{ mt: 0.5, px: 0 }}
              >
                {step.cta} →
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function CopilotCard() {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h6" component="h2">
        Governance Co-Pilot
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Not sure whether to use AI for something? Describe the use and get a clear recommendation —
        grounded in recognized standards and your policy. The Co-Pilot advises; you decide.
      </Typography>
      <Box>
        <Button variant="outlined" component={NextLink} href="/copilot">
          Should we use AI for this?
        </Button>
      </Box>
    </Paper>
  );
}

function RunSkillCard() {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h6" component="h2">
        Run a Skill
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Draft an everyday task — like a donor thank-you — as a governed Skill. Every run is checked
        against your policy and recorded, and you review the draft before using it.
      </Typography>
      <Box>
        <Button variant="contained" component={NextLink} href="/skills">
          Open Skills
        </Button>
      </Box>
    </Paper>
  );
}

/**
 * Recent activity (Chunk 3 wire-up, Lane B). A Doer's few most recent runs + a link into the full
 * registry. Presentation-only: it renders the `runs` passed in — the page does the data access (the
 * card's own constraint holds). `null` = failed to load (error state), `[]` = no runs yet (empty
 * state); the two are shown differently so an error never masquerades as "no activity".
 */
function RecentActivityCard({ runs }: { runs: MyRunEntry[] | null }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="h6" component="h2">
        Recent activity
      </Typography>

      {runs === null ? (
        <Typography variant="body2" color="text.secondary" role="status">
          We couldn&apos;t load your recent activity just now. Please try again shortly.
        </Typography>
      ) : runs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Your recent Skill runs will show here once you&apos;ve run a few.
        </Typography>
      ) : (
        <>
          <Box
            component="ul"
            aria-label="Your recent runs"
            sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column' }}
          >
            {runs.map((r) => (
              <Box
                component="li"
                key={r.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 2,
                  py: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {r.skillName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {formatWhen(r.createdAt)} · {outcomeLabel(r.status)}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box>
            <Button variant="text" component={NextLink} href="/dashboard/usage/mine">
              See your full record
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
}

/** Render a timestamp as a short, readable date. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * "Something is waiting" line at the top of Home (card "Tell leaders when something is waiting for
 * their review"), for every role that can review. Says so plainly when nothing is waiting, so silence
 * is never ambiguous. A standing status (role="status"), meaning in words, not color alone.
 */
function WaitingForReview({ pending }: { pending: PendingReviewsSummary }) {
  const line = waitingHeadline(pending, new Date());
  if (!line) {
    return (
      <Typography variant="body2" color="text.secondary" role="status">
        Nothing is waiting for review.
      </Typography>
    );
  }
  return (
    <Paper
      variant="outlined"
      role="status"
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        borderColor: 'warning.main',
        borderLeftWidth: 4,
      }}
    >
      <Box>
        <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700 }}>
          {line.headline}
        </Typography>
        {line.age ? (
          <Typography variant="body2" color="text.secondary">
            {line.age.charAt(0).toUpperCase() + line.age.slice(1)}.
          </Typography>
        ) : null}
      </Box>
      <Button component={NextLink} href="/approvals" variant="contained">
        Go to Human Review
      </Button>
    </Paper>
  );
}
