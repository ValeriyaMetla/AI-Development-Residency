import { createClient } from '@/lib/data/supabase/server';
import type { CopilotTier, CopilotVerdict, Recommendation } from '@/lib/domain/copilot';

/**
 * Governance Co-Pilot data-source accessor (Data-Source layer, ADR-0003 / ADR-0010).
 *
 * The only place that writes a copilot_assessment. An assessment is the immutable child of a
 * task_run (the `copilot` skill), org-scoped via that parent (the task_output pattern), so this
 * runs under the user's JWT and the RLS from 20261114010000_copilot_assessment.sql applies.
 * Reads for grounding reuse standards.ts / policy.ts; this module only persists. Writes log and
 * return null on error (ADR-14 graceful degradation).
 */

export type SaveCopilotAssessmentParams = {
  taskRunId: string;
  verdict: CopilotVerdict;
  tier: CopilotTier;
  /** The structured recommendation (design §5.2); stored as jsonb. Holds no raw sensitive content. */
  recommendation: Recommendation;
  policyId: string | null;
  provenanceLabel: string;
  humanDecisionRequired: boolean;
};

/** Persist one assessment. Returns the new id, or null on error. */
export async function saveCopilotAssessment(
  params: SaveCopilotAssessmentParams,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('copilot_assessment')
    .insert({
      task_run_id: params.taskRunId,
      verdict: params.verdict,
      tier: params.tier,
      recommendation: params.recommendation,
      policy_id: params.policyId,
      provenance_label: params.provenanceLabel,
      human_decision_required: params.humanDecisionRequired,
    })
    .select('id')
    .single();
  if (error) {
    console.error('saveCopilotAssessment failed:', error.message);
    return null;
  }
  return data.id as string;
}
