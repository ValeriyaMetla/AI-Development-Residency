import { draftWithClaude } from '@/lib/data/claude';
import {
  getSkillByKey,
  createTaskRun,
  updateTaskRunStatus,
  writeAuditEvent,
} from '@/lib/data/runs';
import { getActivePolicy } from '@/lib/data/policy';
import { getAllStandardRules } from '@/lib/data/standards';
import { saveCopilotAssessment } from '@/lib/data/copilot';
import { assess, type Recommendation, type SignalInput } from '@/lib/domain/copilot';
import { countedLabel, redactPii, type PiiFinding } from '@/lib/domain/pii';
import {
  buildCitationMap,
  groundReasons,
  baselineCitations,
  type FinalRecommendation,
} from '@/lib/domain/copilot-grounding';

/**
 * The Governance Co-Pilot pipeline (Domain layer, ADR-0010 §8). A SIBLING of runGovernedSkill that
 * reuses the shared Data-Source helpers but INVERTS the order to assess-then-narrate: deterministic
 * tiering runs FIRST (pure code, the model gets no vote), then the LLM only explains the result.
 * Every assessment is logged (ADR-5/6); nothing is thrown past this layer (ADR-14 resilience).
 *
 * Personal details are stripped from the typed text FIRST, exactly as Skill runs do
 * (`redactPii`, card "Strip personal details in the Co-Pilot before the AI sees them"). Only the
 * redacted text is stored or sent to the model. The verdict can't change: tiering reads the
 * checkbox answers (`signals`), never the text.
 */

const COPILOT_SKILL_KEY = 'governance_copilot';
const PROVENANCE_LABEL = 'AI-assisted governance advice — a person decides';

export type CopilotAssessmentResult =
  | {
      status: 'completed' | 'needs_review';
      assessmentId: string | null;
      recommendation: FinalRecommendation;
      /** Plain sentence naming what was removed (categories only), or null when nothing was. */
      piiNotice: string | null;
    }
  | { status: 'blocked'; message: string };

export async function runCopilotAssessment(params: {
  userInput: string;
  signals: SignalInput;
  userId: string;
  orgId: string;
}): Promise<CopilotAssessmentResult> {
  const { signals, userId, orgId } = params;

  // 0. Strip personal details before anything is stored or sent (Build Plan ADR-6). From here on
  //    only `safeInput` is used; the raw text goes no further than this line.
  const { redacted: safeInput, findings: piiFindings } = redactPii(params.userInput);

  // 1. Context — the copilot skill + the grounding sources (active policy + standards floor).
  const skill = await getSkillByKey(COPILOT_SKILL_KEY);
  if (!skill) return { status: 'blocked', message: 'The Co-Pilot is unavailable right now.' };

  // The active policy is stamped on the run (provenance) and recorded as applied. Policy-first
  // citation grounding (§6.4) and the per-rule check layer on in Epic 5.
  const activePolicy = await getActivePolicy(orgId);

  const standards = await getAllStandardRules();
  // Fail-closed if the standards floor is gone — never emit an ungrounded verdict (ADR-0010 §8).
  if (standards.length === 0) {
    return {
      status: 'blocked',
      message:
        'Cannot assess this safely right now — the standards library is unavailable. Please try again, or ask a person.',
    };
  }
  const citationMap = buildCitationMap(standards);

  // 2. Open a task run, stamped with the policy in force (provenance + inheritance, ADR-0009).
  const taskRunId = await createTaskRun({
    orgId,
    skillId: skill.id,
    runBy: userId,
    inputSummary: safeInput.slice(0, 200),
    policyId: activePolicy?.id ?? null,
  });
  if (!taskRunId) return { status: 'blocked', message: 'Could not start the assessment.' };

  // Record that personal details were removed — category names only, never the values (ADR-6).
  if (piiFindings.length > 0) {
    await writeAuditEvent({
      orgId,
      taskRunId,
      actor: userId,
      eventType: 'pii_stripped',
      payload: { categories: piiFindings.map((f) => f.category) },
    });
  }

  // 3. ASSESS — deterministic tiering (pure Domain code, ADR-0010). The verdict is decided HERE.
  const rec = assess(signals);

  // 4. Ground the reasons with real citations (resolved by code — no fabrication, ADR-0010 §6).
  const groundedReasons = groundReasons(rec.reasons, citationMap);
  const baselineRules = baselineCitations(citationMap);

  // 5. NARRATE — the LLM ONLY explains the already-decided verdict (graceful: templated on failure).
  const summary = await narrate(rec, safeInput);

  const recommendation: FinalRecommendation = {
    verdict: rec.verdict,
    tier: rec.tier,
    tierLabel: rec.tierLabel,
    summary,
    signals: rec.signals,
    reasons: groundedReasons,
    baselineRules,
    saferWay: rec.saferWay,
    humanDecisionRequired: rec.humanDecisionRequired,
    policyApplied: activePolicy !== null,
  };

  // 6. Persist the assessment + audit (audit payload holds no sensitive content, ADR-6).
  const assessmentId = await saveCopilotAssessment({
    taskRunId,
    verdict: rec.verdict,
    tier: rec.tier,
    recommendation,
    policyId: activePolicy?.id ?? null,
    provenanceLabel: PROVENANCE_LABEL,
    humanDecisionRequired: rec.humanDecisionRequired,
  });

  const status = rec.humanDecisionRequired ? 'needs_review' : 'completed';
  await updateTaskRunStatus(taskRunId, status);
  await writeAuditEvent({
    orgId,
    taskRunId,
    actor: userId,
    eventType: 'copilot_assessed',
    payload: { verdict: rec.verdict, tier: rec.tier, status },
  });

  return {
    status,
    assessmentId,
    recommendation,
    piiNotice: removedNotice(piiFindings),
  };
}

/**
 * The sentence shown on the result when details were removed — the same wording the Skill runner
 * uses, so both say it the same way. Category labels only, never the values. Null when nothing was.
 */
export function removedNotice(findings: PiiFinding[]): string | null {
  if (findings.length === 0) return null;
  const labels = findings.map((f) => (f.count > 1 ? countedLabel(f) : f.label)).join(', ');
  return `Personal information was removed before the AI saw it: ${labels}.`;
}

/** A deterministic templated explanation, used as-is when the LLM is unavailable (ADR-0010 §8). */
export function templatedSummary(rec: Recommendation): string {
  switch (rec.verdict) {
    case 'use':
      return 'This looks low-risk — you can go ahead, with the usual baseline safeguards.';
    case 'use_with_conditions':
      return 'You can use AI here, but only with conditions — see the safer-way steps below.';
    case 'dont':
      return "We'd advise against using AI for this — there's no safe way to do it.";
    case 'out_of_scope':
      return "This needs a person to judge — the Co-Pilot can't responsibly answer it.";
  }
}

/** The LLM explains the verdict in one plain-language sentence (from the REDACTED text only); falls back to the template. */
async function narrate(rec: Recommendation, safeInput: string): Promise<string> {
  const templated = templatedSummary(rec);
  const system =
    'You explain a governance decision to a non-technical nonprofit leader in ONE short, warm, ' +
    'plain-language sentence. The decision is ALREADY MADE and you must not change it: ' +
    `verdict="${rec.verdict}", risk tier="${rec.tier}". The reasons are: ` +
    `${rec.reasons.map((r) => r.plainText).join(' ')} ` +
    'Do NOT change the verdict, add new reasons, or invent any facts, citations, or numbers. ' +
    'Return only the one sentence.';
  const out = await draftWithClaude(system, safeInput);
  return out.ok && out.text.trim() ? out.text.trim() : templated;
}
