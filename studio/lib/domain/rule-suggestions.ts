import type { SignalEvent } from '@/lib/data/suggestions';
import type { StandardsByCode } from '@/lib/domain/policy-generator';

/**
 * Rule suggestions — PURE logic (Domain layer, ADR-0003 / ADR-0025; spec:
 * docs/specs/epic-1-rule-suggestion-logic.md). No I/O and no model call: deterministic and
 * inspectable, so a leader can see exactly why a suggestion appeared (a key, a count, a window).
 * The data import is type-only, so nothing from Supabase reaches this layer (Leak Test holds).
 *
 * This module grows across the feature's cards:
 *   - Detect recurring patterns (this card): signal keys -> distinct-run counts -> threshold.
 *   - Surface candidate suggestions (dedup): catalog wording + coverage dedup.
 *
 * Output carries counts only — never run content and never who ran a task.
 */

/** Rolling window the registry is counted over (spec §4). */
export const SUGGESTION_WINDOW_DAYS = 30;
/** Distinct runs in the window that make a key a pattern candidate (spec §4). */
export const SUGGESTION_MIN_RUNS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the counting window ending at `now`. */
export function suggestionWindowStart(now: Date): Date {
  return new Date(now.getTime() - SUGGESTION_WINDOW_DAYS * DAY_MS);
}

/** A recurring use type over the threshold — the input to the surfacing/dedup step. */
export type PatternCandidate = { key: string; count: number; windowDays: number };

// Ids/categories come from our own detectors, but the payload is stored data, so it is parsed as
// untrusted: only short lowercase identifiers become keys.
const SAFE_ID = /^[a-z0-9_-]{1,40}$/;

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && SAFE_ID.test(v));
}

/**
 * The suggestion keys one audit event carries: `risky:<pattern id>` for risky-use events,
 * `pii:<category>` for PII events. A malformed or legacy payload (e.g. the pre-ADR-0025 `{}`)
 * yields no keys rather than an error.
 */
export function signalKeys(event: Pick<SignalEvent, 'eventType' | 'payload'>): string[] {
  const payload = event.payload;
  if (typeof payload !== 'object' || payload === null) return [];
  const fields = payload as Record<string, unknown>;
  const keys =
    event.eventType === 'risky_use_flagged'
      ? stringIds(fields.patterns).map((id) => `risky:${id}`)
      : stringIds(fields.categories).map((c) => `pii:${c}`);
  return [...new Set(keys)];
}

/**
 * Detect recurring use types: count DISTINCT runs per key inside the window ending at `now`, and
 * keep keys with at least SUGGESTION_MIN_RUNS. A run counts once per key even if several events
 * carry it (e.g. a category both stripped and kept). Events with no run id cannot be counted
 * distinctly and are skipped. Sorted most-frequent first, then by key, so output is stable.
 */
export function detectPatterns(events: SignalEvent[], now: Date): PatternCandidate[] {
  const start = suggestionWindowStart(now).getTime();
  const end = now.getTime();
  const runsByKey = new Map<string, Set<string>>();

  for (const event of events) {
    if (!event.taskRunId) continue;
    const at = Date.parse(event.createdAt);
    if (Number.isNaN(at) || at < start || at > end) continue;
    for (const key of signalKeys(event)) {
      const runs = runsByKey.get(key) ?? new Set<string>();
      runs.add(event.taskRunId);
      runsByKey.set(key, runs);
    }
  }

  return [...runsByKey.entries()]
    .filter(([, runs]) => runs.size >= SUGGESTION_MIN_RUNS)
    .map(([key, runs]) => ({ key, count: runs.size, windowDays: SUGGESTION_WINDOW_DAYS }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------------------------------------
// Surfacing (card: "Surface candidate rule suggestions (dedup)") — spec §5–§6, ADR-0025 §3–§4.
// ---------------------------------------------------------------------------------------------

/** One catalog entry: the pre-written rule a key proposes, and the standard that grounds it. */
export type SuggestionCatalogEntry = {
  /** Plain-language rule, in the rule-format house style (one sentence, first person). */
  ruleText: string;
  /** The seeded `standard_rule` code it cites — the citation is resolved, never generated. */
  standardCode: string;
  /** Plain name of the recurring use type, for the count-only evidence line. */
  useLabel: string;
};

/**
 * The suggestion catalog (spec §5). Only these keys can ever be surfaced. Deliberately absent:
 * `risky:ranking-people` (already prohibited by a locked baseline rule — a coaching signal, not a
 * missing rule) and `pii:email` / `pii:phone` (routine contact details, already stripped + flagged).
 */
export const SUGGESTION_CATALOG: Readonly<Record<string, SuggestionCatalogEntry>> = {
  'risky:medical': {
    ruleText:
      "We don't use AI to give medical advice, and a person checks any health-related draft before it is used.",
    standardCode: 'euaiact-human-override',
    useLabel: 'Health-related tasks',
  },
  'risky:legal': {
    ruleText:
      "We don't use AI to give legal advice, and a person checks any legal-related draft before it is used.",
    standardCode: 'euaiact-human-override',
    useLabel: 'Legal-related tasks',
  },
  'risky:benefits-housing': {
    ruleText:
      "A person decides anything about someone's housing, benefits, or immigration situation, and AI only helps with drafting.",
    standardCode: 'euaiact-human-override',
    useLabel: 'Housing, benefits, or immigration tasks',
  },
  'risky:safety-crisis': {
    ruleText:
      "When a task involves someone's safety or a crisis, a person handles it directly and AI is not used to respond.",
    standardCode: 'euaiact-human-override',
    useLabel: 'Safety or crisis tasks',
  },
  'risky:decision-about-person': {
    ruleText:
      'A person makes every hiring, admission, or eligibility decision, and AI only helps prepare supporting material.',
    standardCode: 'euaiact-human-override',
    useLabel: 'Decisions about a specific person',
  },
  'pii:us_ssn': {
    ruleText: 'We never put Social Security numbers into AI tools.',
    standardCode: 'iso42001-data-governance',
    useLabel: 'Social Security numbers in task input',
  },
  'pii:credit_card': {
    ruleText: 'We never put payment card numbers into AI tools.',
    standardCode: 'iso42001-data-governance',
    useLabel: 'Payment card numbers in task input',
  },
};

/** A surfaced, net-new rule suggestion — ready for the leader to review (card 4). */
export type RuleSuggestion = {
  key: string;
  ruleText: string;
  standardRuleId: string;
  citation: string;
  category: string;
  riskTier: string;
  /** Count-only evidence: how many distinct runs, over how many days. No content, no people. */
  count: number;
  windowDays: number;
  evidenceLabel: string;
};

/** Plain evidence line, e.g. "Health-related tasks — 4 times in the last 30 days". */
export function suggestionEvidenceLabel(
  useLabel: string,
  count: number,
  windowDays: number,
): string {
  return `${useLabel} — ${count} times in the last ${windowDays} days`;
}

/** What "already covered" means (ADR-0025 §4, plus the card's check against existing rules). */
export type CoverageContext = {
  /** Keys the org has recorded a decision on (accepted or dismissed). */
  decidedKeys: ReadonlySet<string>;
  /** Keys carried by rules in the ACTIVE policy (accepted suggestions, origin 'suggested'). */
  activeRuleKeys: ReadonlySet<string>;
  /** The standards catalog, by code, for citations. */
  standardsByCode: StandardsByCode;
};

/**
 * Turn pattern candidates into net-new suggestions. A candidate is dropped when:
 *   - its key is not in the catalog (unknown, or deliberately excluded);
 *   - it is COVERED — the org recorded a decision on it, or the active policy already has a rule
 *     accepted from it (this second check also covers an accept whose decision write failed);
 *   - its grounding standard can't be resolved — a suggestion is never shown without a citation.
 * Order follows the candidates (most frequent first).
 */
export function surfaceSuggestions(
  candidates: PatternCandidate[],
  ctx: CoverageContext,
): RuleSuggestion[] {
  const out: RuleSuggestion[] = [];
  for (const c of candidates) {
    const entry = Object.hasOwn(SUGGESTION_CATALOG, c.key) ? SUGGESTION_CATALOG[c.key] : undefined;
    if (!entry) continue;
    if (ctx.decidedKeys.has(c.key) || ctx.activeRuleKeys.has(c.key)) continue;
    const standard = ctx.standardsByCode.get(entry.standardCode);
    if (!standard) continue;
    out.push({
      key: c.key,
      ruleText: entry.ruleText,
      standardRuleId: standard.id,
      citation: standard.citation,
      category: standard.category,
      riskTier: standard.riskTier,
      count: c.count,
      windowDays: c.windowDays,
      evidenceLabel: suggestionEvidenceLabel(entry.useLabel, c.count, c.windowDays),
    });
  }
  return out;
}
