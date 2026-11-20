/**
 * Which tags a policy rule shows to a Leader (Domain, ADR-0003) — card "Make the policy review
 * screen honest about what can change".
 *
 * A rule's `needsReview` flag means it was filled from a DEFAULT answer, not one the Leader gave
 * (`policy-generator.ts`, `gate.viaDefault`). Reviewing only means something if the Leader can act
 * on it: an unlocked rule can be edited after activation (ADR-0024), which clears the flag. A
 * baseline-safety rule is locked — never editable, never turned off — so asking the Leader to
 * "review" it promises an action that doesn't exist. Those show as the always-on safety floor
 * instead. Display only: nothing here changes what is locked, saved, or audited.
 */

/** Both flags are optional on a new rule; a missing flag means false. */
type TaggableRule = { needsReview?: boolean; isBaselineSafety?: boolean };

/** True when a rule should show "Needs review": filled from a default AND changeable later. */
export function showsNeedsReview(rule: TaggableRule): boolean {
  return rule.needsReview === true && rule.isBaselineSafety !== true;
}

/** How many rules show "Needs review" — the count in "N flagged for your review". */
export function needsReviewCount(rules: TaggableRule[]): number {
  return rules.filter(showsNeedsReview).length;
}
