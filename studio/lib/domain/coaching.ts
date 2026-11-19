import { detectRiskyUse } from '@/lib/domain/risky-use';

/**
 * In-the-moment coaching (Domain layer, ADR-0003 / Epic 6). PURE and deterministic — no model call,
 * no I/O — so it runs live in the runner as the Doer types (like the PII detector) and is fully
 * unit-testable. It turns the app's existing risky-use signal from a silent catch into a kind,
 * in-the-moment nudge: a guide-not-scold message plus a concrete safer way to do the task.
 *
 * "Apply the safer way" (Epic 6) replaces the Doer's input with `saferRewrite` — a reframing that
 * keeps AI as an assistant to a human rather than the decider. Each rewrite is written to NOT re-trip
 * its own risk pattern (see coaching.test.ts), so accepting it genuinely lands on a safe task. When
 * AI is the wrong tool entirely (a safety/crisis situation), `saferRewrite` is null and the message
 * points to a person instead.
 */

export type CoachingNudge = {
  /** The risk-pattern id this nudge coaches (from detectRiskyUse). */
  id: string;
  /** Guide, not scold — a kind, plain heads-up about why this needs care. */
  message: string;
  /** A safer task to drop into the input on "use the safer way", or null when AI isn't the tool. */
  saferRewrite: string | null;
};

const COACHING: Record<string, { message: string; saferRewrite: string | null }> = {
  'decision-about-person': {
    message:
      "This looks like asking AI to decide about a person. A decision like that should be a person's — AI can help you get ready to make it.",
    saferRewrite:
      'Help me prepare to make this call myself: list the key questions and considerations a person should weigh. Don’t recommend a choice. (Add the specifics.)',
  },
  'ranking-people': {
    message:
      'This looks like asking AI to rank or score people. People shouldn’t be ordered by AI — but it can help you set fair, clear criteria a person then applies.',
    saferRewrite:
      'Help me define clear, fair criteria a person can apply when reviewing, so the judgement stays with a human. (Add what you’re assessing.)',
  },
  medical: {
    message:
      'This touches medical territory. AI isn’t a clinician — but it can help you point someone to the right professional.',
    saferRewrite:
      'Help me write a kind note encouraging this person to speak with a qualified health professional. Don’t offer any clinical guidance. (Add any context.)',
  },
  legal: {
    message:
      'This touches legal territory. AI isn’t a lawyer — but it can help you get ready to talk to one.',
    saferRewrite:
      'Help me list the questions I should bring to a qualified lawyer about this. Don’t offer legal guidance. (Add the situation.)',
  },
  'benefits-housing': {
    message:
      'This touches housing or benefits, which affect people’s lives directly. AI can help you find the right official channel.',
    saferRewrite:
      'Help me find the official process and who to contact about this housing or benefits question, so a qualified person handles it. (Add details.)',
  },
  'safety-crisis': {
    message:
      'This looks like a safety or crisis situation. Please bring in a person — or a crisis line — right now. AI isn’t the right tool here.',
    saferRewrite: null,
  },
};

/**
 * Coaching nudges for the risk patterns in the input (empty when none) — pure, mirrors
 * detectRiskyUse. A pattern with no tailored entry falls back to its plain reason and no rewrite, so
 * a new risk pattern is never left un-coached.
 */
export function coachingFor(input: string): CoachingNudge[] {
  return detectRiskyUse(input).map((finding) => {
    const entry = COACHING[finding.id] ?? {
      message: `${finding.reason} A person should take the lead here.`,
      saferRewrite: null,
    };
    return { id: finding.id, message: entry.message, saferRewrite: entry.saferRewrite };
  });
}
