/**
 * Command-like rule scanner (Domain layer, ADR-0032 point 2 · PenTest F-20 · SR-05). Pure, rule-based,
 * no AI.
 *
 * Policy rule text is passed to the AI as data (policy-context.ts), but that is formatting, not
 * enforcement. This scanner is the human-facing layer: it flags rule text that reads like an
 * instruction to the AI — role tags, hidden-instruction brackets, "ignore the rules", "end every answer
 * with…" — so an Accountable Leader sees it BEFORE an imported or edited policy goes live.
 *
 * It WARNS; it never blocks. It is a list of patterns, so it will miss phrasings not on it and can
 * occasionally flag an honest rule (ADR-0032 Consequences); a person decides. Tune the list here, with
 * a test: test/policy-injection-scan.test.ts.
 */

type Pattern = { test: RegExp; reason: string };

const PATTERNS: readonly Pattern[] = [
  {
    test: /\b(assistant|system|user|developer)\s*:/i,
    reason: 'It contains a role tag (like “assistant:”) that speaks to the AI directly.',
  },
  {
    test: /\[\[|\]\]|<\s*\/?\s*(system|assistant|user|instructions?|prompt)\b[^>]*>/i,
    reason: 'It contains hidden-instruction brackets or tags (like [[ ]] or <system>).',
  },
  {
    test: /\b(ignore|disregard|forget|override|bypass)\b[^.!?]{0,40}\b(rules?|instructions?|polic(y|ies)|prompts?|guidelines?|above|previous)\b/i,
    reason: 'It tells the AI to ignore rules or instructions.',
  },
  {
    test: /\b(end|start|begin|finish|close|open)\s+(every|each|all|your|any)\s+(answers?|responses?|replies|reply|messages?|outputs?|drafts?)\s+with\b/i,
    reason: 'It tells the AI how to start or end every answer.',
  },
  {
    test: /\b(respond|reply|answer|output)\s+(only|exclusively)\s+(with|in|using)\b/i,
    reason: 'It tells the AI to answer only in a set way.',
  },
  {
    test: /\byou are now\b|\bact as (an?|the)\b|\bpretend (to be|you are)\b|\bfrom now on,? you\b/i,
    reason: 'It tells the AI to take on a different role.',
  },
  {
    test: /\b(reveal|print|show|repeat|output)\b[^.!?]{0,30}\b(system prompt|your instructions|your prompt|hidden instructions)\b/i,
    reason: 'It asks the AI to reveal its instructions.',
  },
];

/** Plain-language reasons this rule text looks like a command to the AI. Empty = nothing found. */
export function scanRuleText(ruleText: string): string[] {
  return PATTERNS.filter((p) => p.test.test(ruleText)).map((p) => p.reason);
}

export type FlaggedRule = { ruleText: string; reasons: string[] };

/** Only the rules that look command-like, each with its reasons (in the order given). */
export function flagCommandLikeRules(rules: { ruleText: string }[]): FlaggedRule[] {
  return rules
    .map((r) => ({ ruleText: r.ruleText, reasons: scanRuleText(r.ruleText) }))
    .filter((r) => r.reasons.length > 0);
}
