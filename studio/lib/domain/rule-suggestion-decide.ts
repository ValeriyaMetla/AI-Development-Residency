import { getActivePolicy, getPolicyRules } from '@/lib/data/policy';
import { recordSuggestionDecision } from '@/lib/data/suggestions';
import { writeAuditEvent } from '@/lib/data/runs';
import { publishEditedPolicy } from '@/lib/domain/policy-publish';
import { getRuleSuggestions } from '@/lib/domain/rule-suggestion-service';
import { SUGGESTION_CATALOG } from '@/lib/domain/rule-suggestions';

/**
 * The human decision on a rule suggestion (Domain layer, ADR-0003 / ADR-0025) — card: Build
 * "accept suggested rule" flow. Nothing becomes a rule without the leader's explicit accept.
 *
 * Trust boundary: the client sends only a suggestion KEY (and, on accept, the possibly-edited text).
 * Everything else — whether the suggestion is currently valid, its citation, standard, category, and
 * risk tier — is re-derived here on the server. Access control (Accountable Leader only) is enforced
 * by the calling Service action. Nothing is thrown past this layer (ADR-14).
 */

export type AcceptSuggestionResult =
  | { status: 'accepted'; policyId: string }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

export type DismissSuggestionResult =
  | { status: 'dismissed' }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

/**
 * Accept a suggestion: publish a NEW policy version (ADR-0024) with every current rule unchanged plus
 * the suggested rule (origin 'suggested'), then record the decision. If the decision write fails
 * after a successful publish, the rule is still live and the active-rule coverage check (card 3)
 * keeps it from being re-suggested — so the accept still reports success.
 */
export async function acceptSuggestion(params: {
  orgId: string;
  userId: string;
  suggestionKey: string;
  ruleText: string;
  now?: Date;
}): Promise<AcceptSuggestionResult> {
  const { orgId, userId, suggestionKey, ruleText } = params;

  // 1. Re-derive: the key must be a CURRENTLY surfaced suggestion (recurring, uncovered, cited).
  const current = await getRuleSuggestions(orgId, params.now);
  if (current.status !== 'ok') return { status: 'failed', message: current.message };
  const suggestion = current.suggestions.find((s) => s.key === suggestionKey);
  if (!suggestion) {
    return { status: 'blocked', message: 'This suggestion is no longer available.' };
  }

  // 2. The authoritative active rules.
  const active = await getActivePolicy(orgId);
  if (!active) return { status: 'blocked', message: 'Set up your AI rules before adding to them.' };
  const rules = await getPolicyRules(active.id);
  // An active policy always carries its baseline rules, so an empty list means the read failed.
  // Publishing from it would drop every existing rule (including locked baselines) — fail closed.
  if (rules.length === 0) {
    return { status: 'failed', message: 'Could not load your current rules. Please try again.' };
  }

  // 3. Publish: keep every current non-baseline rule as-is (baselines carry forward automatically),
  // and add the suggestion with server-side citation/category; only the text is the leader's.
  const published = await publishEditedPolicy({
    orgId,
    createdBy: userId,
    policyName: active.name,
    current: rules,
    input: {
      edits: rules
        .filter((r) => !r.isBaselineSafety)
        .map((r) => ({ id: r.id, ruleText: r.ruleText })),
      additions: [],
      suggested: {
        suggestionKey: suggestion.key,
        ruleText,
        standardRuleId: suggestion.standardRuleId,
        citation: suggestion.citation,
        category: suggestion.category,
        riskTier: suggestion.riskTier,
      },
    },
  });
  if (published.status !== 'published') return published;

  // 4. Record the decision + audit (no rule text in the audit payload, ADR-6).
  await recordSuggestionDecision({
    orgId,
    suggestionKey: suggestion.key,
    decision: 'accepted',
    decidedBy: userId,
    policyId: published.policyId,
  });
  await writeAuditEvent({
    orgId,
    taskRunId: null,
    actor: userId,
    eventType: 'rule_suggestion_accepted',
    payload: { suggestionKey: suggestion.key, policyId: published.policyId },
  });

  return { status: 'accepted', policyId: published.policyId };
}

/** Dismiss a suggestion: record the decision so it is never suggested again. No policy change. */
export async function dismissSuggestion(params: {
  orgId: string;
  userId: string;
  suggestionKey: string;
}): Promise<DismissSuggestionResult> {
  const { orgId, userId, suggestionKey } = params;
  // Only catalog keys can be decided on — no arbitrary strings stored as decisions.
  if (!Object.hasOwn(SUGGESTION_CATALOG, suggestionKey)) {
    return { status: 'blocked', message: 'Unknown suggestion.' };
  }

  const ok = await recordSuggestionDecision({
    orgId,
    suggestionKey,
    decision: 'dismissed',
    decidedBy: userId,
  });
  if (!ok)
    return { status: 'failed', message: 'Could not dismiss the suggestion. Please try again.' };

  await writeAuditEvent({
    orgId,
    taskRunId: null,
    actor: userId,
    eventType: 'rule_suggestion_dismissed',
    payload: { suggestionKey },
  });
  return { status: 'dismissed' };
}
