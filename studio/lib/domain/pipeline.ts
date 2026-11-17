import { draftWithClaude } from '@/lib/data/claude';
import {
  getSkillByKey,
  createTaskRun,
  updateTaskRunStatus,
  saveTaskOutput,
  saveGuardrailCheck,
  writeAuditEvent,
} from '@/lib/data/runs';
import { getActivePolicy, getPolicyRules } from '@/lib/data/policy';
import { ruleCheck, mostSevere, type GuardrailResult } from '@/lib/domain/guardrails';
import { withPolicyContext } from '@/lib/domain/policy-context';
import { getSkillDef } from '@/lib/domain/skills';
import { redactPii, piiSummary, type PiiFinding, type PiiCategory } from '@/lib/domain/pii';
import { riskyUseFinding } from '@/lib/domain/risky-use';
import {
  buildCritiquePrompt,
  parseCritique,
  critiqueToFinding,
  critiqueUnavailableFinding,
  critiqueSummary,
  type CritiqueResult,
} from '@/lib/domain/self-critique';

/**
 * The governed-run pipeline (Domain layer, ADR-0003 / Build Plan ADR-11) — the one
 * fixed path every Skill passes through: context -> draft -> self-critique -> rule-check
 * -> provenance -> persist + audit. Every run is logged (ADR-5/6); nothing is thrown
 * past this layer (ADR-14 resilience).
 *
 * Self-critique is a real model-based Challenger pass (ADR-0015): it reviews the draft, can make
 * ONE bounded revision, and fails closed to human review on error — but it never replaces the
 * deterministic rule-check, which runs afterward as code outside the model (ADR-0014). PII
 * stripping and the human-approval gate before anything is sent arrive with Chunk 2.
 */

const PROVENANCE_LABEL = 'AI-generated with Claude (Sonnet)';

export type RunResult =
  | {
      status: 'completed' | 'needs_review';
      output: string;
      provenanceLabel: string;
      guardrail: GuardrailResult;
      /** PII categories detected in the input (no raw values), for the runner to surface. */
      pii: PiiFinding[];
      /** Categories the Doer deliberately KEPT this run (the rest were stripped). */
      piiKept: PiiCategory[];
    }
  | { status: 'blocked'; message: string };

export async function runGovernedSkill(params: {
  skillKey: string;
  userInput: string;
  userId: string;
  orgId: string;
  /** Categories the Doer chose to keep (deliberate-keep override); the rest are stripped. */
  keepCategories?: PiiCategory[];
}): Promise<RunResult> {
  const { skillKey, userInput, userId, orgId, keepCategories = [] } = params;

  // 1. Context — load the Skill and the org's ACTIVE policy (inheritance, Epic 1). The
  // policy is read fresh on every run, so editing/re-activating a policy propagates to the
  // next run with no redeploy.
  const skill = await getSkillByKey(skillKey);
  const skillDef = getSkillDef(skillKey);
  if (!skill || !skillDef) {
    return { status: 'blocked', message: 'Unknown Skill.' };
  }
  const basePrompt = skillDef.basePrompt;
  const activePolicy = await getActivePolicy(orgId);
  const policyRules = activePolicy ? await getPolicyRules(activePolicy.id) : [];
  const systemPrompt = withPolicyContext(basePrompt, policyRules);

  // 2. PII detection + strip BEFORE anything is stored or sent (Epic 5, deterministic — code outside
  // the model, so injection can't disable it). Secure-by-default: the model, the input summary, and
  // all storage use the REDACTED text, so the raw value never leaves the server. We record WHICH
  // categories were removed, never the raw value (ADR-6). (Deliberate per-item "keep" is the next card.)
  const { redacted: safeInput, findings: piiFindings } = redactPii(userInput, keepCategories);
  const detectedCategories = piiFindings.map((f) => f.category);
  const piiKept = detectedCategories.filter((c) => keepCategories.includes(c));
  const piiStripped = detectedCategories.filter((c) => !keepCategories.includes(c));

  // 3. Open a task run, stamped with the policy in force (provenance + inheritance). The input
  // summary uses the redacted text — no raw PII in the working record.
  const taskRunId = await createTaskRun({
    orgId,
    skillId: skill.id,
    runBy: userId,
    inputSummary: safeInput.slice(0, 200),
    policyId: activePolicy?.id ?? null,
  });
  if (!taskRunId) {
    return { status: 'blocked', message: 'Could not start the task.' };
  }

  if (piiFindings.length > 0) {
    await saveGuardrailCheck({
      taskRunId,
      checkType: 'pii',
      result: 'flag',
      reasonPlain: `${piiSummary(piiFindings)}${
        piiStripped.length ? ' Stripped by default.' : ''
      }${piiKept.length ? ' Some kept by the user’s choice.' : ''}`,
    });
    // Separate events so the record distinguishes default-strip from the accountable keep choice.
    if (piiStripped.length > 0) {
      await writeAuditEvent({
        orgId,
        taskRunId,
        actor: userId,
        eventType: 'pii_stripped',
        payload: { categories: piiStripped }, // categories only, no raw content (ADR-6)
      });
    }
    if (piiKept.length > 0) {
      await writeAuditEvent({
        orgId,
        taskRunId,
        actor: userId,
        eventType: 'pii_kept',
        payload: { categories: piiKept }, // deliberate keep: actor + categories + time, no raw content
      });
    }
  }

  // 3b. Risky-use flagging (Epic 5, deterministic — code outside the model). Scans the task intent
  // for patterns that warrant human scrutiny (a decision about a person, a high-stakes domain) and
  // flags the run for the human-approval gate. Never blocks — a person reviews it.
  const risky = riskyUseFinding(userInput);
  if (risky.result === 'flag') {
    await saveGuardrailCheck({
      taskRunId,
      checkType: 'risky_use',
      result: 'flag',
      reasonPlain: risky.reason,
    });
    await writeAuditEvent({
      orgId,
      taskRunId,
      actor: userId,
      eventType: 'risky_use_flagged',
      payload: {}, // the fact only — no sensitive content (ADR-6)
    });
  }

  // 4. Draft (Claude, via the Data-Source layer) — grounded in the active policy, on the REDACTED input.
  const draft = await draftWithClaude(systemPrompt, safeInput);
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

  // 4. Self-critique — the model-based Challenger pass (ADR-0015). It reviews its own draft against
  // the Skill intent + active policy and returns a structured verdict (pass / revise / block). On
  // `revise` we take ONE bounded re-draft (the corrected text); on a model error or an unparseable
  // response we FAIL CLOSED to human review (ADR-0014). The model NEVER gets the last word — the
  // deterministic rule-check below is the backstop.
  const critiqueRaw = await draftWithClaude(
    buildCritiquePrompt(basePrompt, policyRules, skillDef.critiqueCriteria),
    draft.text,
  );
  let finalText = draft.text;
  let critique: CritiqueResult | null = null;
  let critiqueFinding: GuardrailResult;
  if (!critiqueRaw.ok) {
    critiqueFinding = critiqueUnavailableFinding();
  } else {
    critique = parseCritique(critiqueRaw.text);
    if (!critique) {
      critiqueFinding = critiqueUnavailableFinding();
    } else {
      critiqueFinding = critiqueToFinding(critique);
      if (critique.verdict === 'revise' && critique.revisedText) {
        finalText = critique.revisedText; // the one bounded re-draft
      }
    }
  }
  await saveGuardrailCheck({
    taskRunId,
    checkType: 'self_critique',
    result: critiqueFinding.result,
    reasonPlain: critiqueFinding.reason,
  });

  // 5. Deterministic, policy-grounded rule-check (Domain, ADR-0014) — checks the (possibly revised)
  // output against the org's active policy rules; code outside the model, so injection can't disable
  // it. Self-critique + rule-check are combined most-severe-wins (block > flag > pass, ADR-0015).
  const ruleResult = ruleCheck(finalText, policyRules);
  await saveGuardrailCheck({
    taskRunId,
    checkType: 'rule_check',
    result: ruleResult.result,
    reasonPlain: ruleResult.reason,
  });
  // Run status is most-severe-wins across: risky-use (input intent), self-critique, and the rule-check
  // (ADR-0014/0015). PII is handled by default-strip above (not a review-forcing flag); its stripped
  // categories are surfaced separately so the Doer always sees what was removed.
  const guardrail = mostSevere([risky, critiqueFinding, ruleResult]);

  // 6. Provenance + persist output (self-critique summary carries no sensitive payload, ADR-6).
  await saveTaskOutput({
    taskRunId,
    content: finalText,
    provenanceLabel: PROVENANCE_LABEL,
    selfCritiqueResult: critiqueSummary(critique),
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
    payload: {
      guardrail: guardrail.result,
      selfCritique: critique?.verdict ?? 'unavailable',
      status,
    },
  });

  if (status === 'blocked') {
    return { status: 'blocked', message: guardrail.reason };
  }
  return {
    status,
    output: finalText,
    provenanceLabel: PROVENANCE_LABEL,
    guardrail,
    pii: piiFindings,
    piiKept,
  };
}
