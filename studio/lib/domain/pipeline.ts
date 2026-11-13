import { draftWithClaude } from '@/lib/data/claude';
import {
  getSkillByKey,
  createTaskRun,
  updateTaskRunStatus,
  saveTaskOutput,
  saveGuardrailCheck,
  writeAuditEvent,
} from '@/lib/data/runs';
import { ruleCheck, type GuardrailResult } from '@/lib/domain/guardrails';

/**
 * The governed-run pipeline (Domain layer, ADR-0003 / Build Plan ADR-11) — the one
 * fixed path every Skill passes through: context -> draft -> self-critique -> rule-check
 * -> provenance -> persist + audit. Every run is logged (ADR-5/6); nothing is thrown
 * past this layer (ADR-14 resilience).
 *
 * Phase 0 shell: one trivial Skill, one deterministic rule-check, a STUBBED
 * self-critique. The real Challenger self-critique pass, policy-grounded context, PII
 * stripping, and the human-approval gate before anything is sent arrive in Phase 1/2.
 */

const PROVENANCE_LABEL = 'AI-generated with Claude (Sonnet)';

// Per-Skill system prompts. Phase 1 replaces this with policy-grounded context.
const SKILL_PROMPTS: Record<string, string> = {
  draft_thank_you:
    'You help a small nonprofit write a short, warm, sincere thank-you note. ' +
    'Keep it to 2–3 sentences. Return only the note text.',
};

export type RunResult =
  | {
      status: 'completed' | 'needs_review';
      output: string;
      provenanceLabel: string;
      guardrail: GuardrailResult;
    }
  | { status: 'blocked'; message: string };

export async function runGovernedSkill(params: {
  skillKey: string;
  userInput: string;
  userId: string;
  orgId: string;
}): Promise<RunResult> {
  const { skillKey, userInput, userId, orgId } = params;

  // 1. Context — load the Skill.
  const skill = await getSkillByKey(skillKey);
  const systemPrompt = SKILL_PROMPTS[skillKey];
  if (!skill || !systemPrompt) {
    return { status: 'blocked', message: 'Unknown Skill.' };
  }

  // 2. Open a task run (mutable working state).
  const taskRunId = await createTaskRun({
    orgId,
    skillId: skill.id,
    runBy: userId,
    inputSummary: userInput.slice(0, 200),
  });
  if (!taskRunId) {
    return { status: 'blocked', message: 'Could not start the task.' };
  }

  // 3. Draft (Claude, via the Data-Source layer).
  const draft = await draftWithClaude(systemPrompt, userInput);
  if (!draft.ok) {
    await saveGuardrailCheck({
      taskRunId,
      checkType: 'self_critique',
      result: 'block',
      reasonPlain: draft.message,
    });
    await updateTaskRunStatus(taskRunId, 'blocked');
    await writeAuditEvent({
      orgId,
      taskRunId,
      actor: userId,
      eventType: 'task_blocked',
      payload: { reason: draft.reason },
    });
    return { status: 'blocked', message: draft.message };
  }

  // 4. Self-critique — STUB for the shell (real Challenger pass is Phase 2).
  const selfCritiqueResult = 'self-critique stubbed (Phase 2)';
  const finalText = draft.text;

  // 5. One deterministic rule-check (Domain).
  const guardrail = ruleCheck(finalText);
  await saveGuardrailCheck({
    taskRunId,
    checkType: 'rule_check',
    result: guardrail.result,
    reasonPlain: guardrail.reason,
  });

  // 6. Provenance + persist output.
  await saveTaskOutput({
    taskRunId,
    content: finalText,
    provenanceLabel: PROVENANCE_LABEL,
    selfCritiqueResult,
  });

  // 7. Final status + audit (audit payload carries no sensitive content, ADR-6).
  const status =
    guardrail.result === 'block'
      ? 'blocked'
      : guardrail.result === 'flag'
        ? 'needs_review'
        : 'completed';
  await updateTaskRunStatus(taskRunId, status);
  await writeAuditEvent({
    orgId,
    taskRunId,
    actor: userId,
    eventType: 'task_completed',
    payload: { guardrail: guardrail.result, status },
  });

  if (status === 'blocked') {
    return { status: 'blocked', message: guardrail.reason };
  }
  return { status, output: finalText, provenanceLabel: PROVENANCE_LABEL, guardrail };
}
