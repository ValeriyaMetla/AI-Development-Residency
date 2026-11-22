/**
 * Demo view model (ADR-0029 T3). PURE: no I/O, no model call, no session.
 *
 * Turns a sample preset into everything the demo's governed-run screen shows, by running the
 * product's REAL safety code on the sample texts: the personal-data strip (`redactPii`,
 * `piiSummary`) and the rule-check (`ruleCheck`). Only the draft is prewritten (ADR-0029 point 3).
 * The screen renders this result and decides nothing itself (ADR-0003, the Leak Test).
 */
import { ruleCheck, type GuardrailResult } from '@/lib/domain/guardrails';
import { piiSummary, redactPii, type PiiFinding } from '@/lib/domain/pii';
import { SAMPLE_PRESETS, SAMPLE_RULES, type SamplePreset } from '@/lib/demo/sample-org';

/**
 * The label every sample draft carries in place of the real provenance label (`AI_PROVENANCE`),
 * because no AI ran (ADR-0029 point 5). One constant, so the screen and the tests share it.
 */
export const DEMO_DRAFT_LABEL = 'Sample draft, written in advance for this demo. No AI ran.';

export type DemoOutcome = {
  status: 'completed' | 'needs_review' | 'blocked';
  /** Plain-language outcome for the screen. */
  label: string;
};

export type DemoRun = {
  preset: SamplePreset;
  pii: {
    findings: PiiFinding[];
    /** The request with personal data replaced by placeholders, as the model would receive it. */
    redactedRequest: string;
    /** The real product sentence describing what was found (categories only, never values). */
    summary: string;
  };
  draft: { text: string; label: string };
  ruleCheck: GuardrailResult;
  outcome: DemoOutcome;
};

const OUTCOMES: Record<DemoOutcome['status'], DemoOutcome> = {
  completed: { status: 'completed', label: 'Completed' },
  needs_review: { status: 'needs_review', label: 'Waiting for Human Review' },
  blocked: { status: 'blocked', label: 'Stopped by the safety check' },
};

/** Same mapping as the real pipeline (`lib/domain/pipeline.ts`): pass → completed, flag → review, block → blocked. */
const OUTCOME_FOR: Record<GuardrailResult['result'], DemoOutcome> = {
  pass: OUTCOMES.completed,
  flag: OUTCOMES.needs_review,
  block: OUTCOMES.blocked,
};

/**
 * Runs one sample preset through the real safety steps. Returns null for an unknown id, so a bad
 * link shows a "not found" state instead of crashing the page.
 */
export function runDemoPreset(id: string): DemoRun | null {
  const preset = SAMPLE_PRESETS.find((p) => p.id === id);
  if (!preset) return null;

  const { redacted, findings } = redactPii(preset.request);
  const check = ruleCheck(preset.preparedDraft, SAMPLE_RULES);
  const outcome = OUTCOME_FOR[check.result];

  return {
    preset,
    pii: { findings, redactedRequest: redacted, summary: piiSummary(findings) },
    draft: { text: preset.preparedDraft, label: DEMO_DRAFT_LABEL },
    ruleCheck: check,
    outcome,
  };
}
