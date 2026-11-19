import { getSuggestionSignalsSince, getSuggestionDecisionKeys } from '@/lib/data/suggestions';
import { getActivePolicy, getPolicyRules } from '@/lib/data/policy';
import { getAllStandardRules } from '@/lib/data/standards';
import type { StandardsByCode } from '@/lib/domain/policy-generator';
import {
  detectPatterns,
  surfaceSuggestions,
  suggestionWindowStart,
  type RuleSuggestion,
} from '@/lib/domain/rule-suggestions';

/**
 * Rule-suggestion orchestration (Domain layer, ADR-0003 / ADR-0025) — the side-effect-free but
 * data-reading half of rule suggestions, kept apart from the pure logic in rule-suggestions.ts
 * (the same split as policy-seed.ts / policy-publish.ts). Read-only: it never writes.
 *
 * Access control is NOT decided here: the Service action that calls this enforces that only the
 * Accountable Leader sees suggestions (as publishRuleEdits does). Nothing is thrown past this layer
 * (ADR-14); every outcome is a typed result.
 */

export type RuleSuggestionsResult =
  { status: 'ok'; suggestions: RuleSuggestion[] } | { status: 'unavailable'; message: string };

const UNAVAILABLE = 'Suggestions are unavailable right now. Please try again later.';

/**
 * The org's net-new rule suggestions at `now`. FAILS CLOSED: if the registry or the decision memory
 * can't be read, it returns `unavailable` rather than a partial list — a partial list could
 * re-surface a suggestion the leader already dismissed.
 */
export async function getRuleSuggestions(
  orgId: string,
  now: Date = new Date(),
): Promise<RuleSuggestionsResult> {
  const signals = await getSuggestionSignalsSince(suggestionWindowStart(now).toISOString());
  if (!signals) return { status: 'unavailable', message: UNAVAILABLE };

  const candidates = detectPatterns(signals, now);
  if (candidates.length === 0) return { status: 'ok', suggestions: [] };

  const decidedKeys = await getSuggestionDecisionKeys();
  if (!decidedKeys) return { status: 'unavailable', message: UNAVAILABLE };

  // Second coverage check (belt-and-braces over the decision memory): rules in the active policy
  // that were accepted from a suggestion. No active policy -> no such rules.
  const active = await getActivePolicy(orgId);
  const rules = active ? await getPolicyRules(active.id) : [];
  const activeRuleKeys = new Set(
    rules.map((r) => r.suggestionKey).filter((k): k is string => typeof k === 'string'),
  );

  // Citations come from the standards catalog; without it nothing can be shown cited.
  const standards = await getAllStandardRules();
  if (standards.length === 0) return { status: 'unavailable', message: UNAVAILABLE };
  const standardsByCode: StandardsByCode = new Map(
    standards.map((s) => [
      s.code,
      {
        id: s.id,
        citation: s.citation,
        ruleText: s.ruleText,
        category: s.category,
        riskTier: s.riskTier,
      },
    ]),
  );

  return {
    status: 'ok',
    suggestions: surfaceSuggestions(candidates, { decidedKeys, activeRuleKeys, standardsByCode }),
  };
}
