import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude API access (Data-Source layer, ADR-0003 / ADR-16).
 *
 * The @anthropic-ai/sdk lives ONLY here — arch-gate bans it in app/ and lib/domain,
 * so every model call goes through this module. The key is read from the server env
 * (ANTHROPIC_API_KEY); it is never exposed to the browser (ADR-10), and the API is
 * used in a no-training / server-side posture (ADR-20).
 *
 * Model: Sonnet by default per Build-Plan ADR-3 (Opus is reserved for hard reasoning).
 */
const MODEL = 'claude-sonnet-5-5';

/**
 * The call is bounded (PenTest F-15 / SR-19): each attempt stops after 30s, with at most 2 SDK
 * retries, so a hung Anthropic request can't tie up a serverless function; and the returned text is
 * capped at 6,000 characters before any caller stores or shows it. A timeout surfaces as an
 * `Anthropic.APIError`, which the catch below turns into the clean tagged error — never a throw.
 */
export const CLAUDE_TIMEOUT_MS = 30_000;
export const CLAUDE_MAX_RETRIES = 2;
export const MAX_AI_TEXT_CHARS = 6_000;

export type DraftResult =
  { ok: true; text: string } | { ok: false; reason: 'refused' | 'error'; message: string };

/**
 * Ask Claude for a draft. Returns a tagged result so callers can degrade
 * gracefully (ADR-14 / Q4): a safety refusal and an API error are both handled,
 * never thrown past this layer. Bounded per F-15 / SR-19 (see the constants above).
 *
 * Phase-1 hardening (flagged, not built): server-side refusal fallbacks, PII
 * stripping before the call, and prompt-injection-hardened context assembly.
 */
export async function draftWithClaude(
  systemPrompt: string,
  userInput: string,
): Promise<DraftResult> {
  const client = new Anthropic(); // resolves ANTHROPIC_API_KEY from the server env

  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userInput }],
      },
      // Per-attempt 30s timeout + bounded retries (SR-19). On timeout the SDK throws an
      // Anthropic.APIError, handled by the catch below as a clean 'error' result.
      { timeout: CLAUDE_TIMEOUT_MS, maxRetries: CLAUDE_MAX_RETRIES },
    );

    if (response.stop_reason === 'refusal') {
      return {
        ok: false,
        reason: 'refused',
        message: 'The AI declined this request on safety grounds.',
      };
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    // Cap AI text before any caller stores or shows it (SR-19). With max_tokens 1024 a response is
    // well under this, so the cap is a safety belt; if it ever trims the self-critique JSON, that
    // path already fails closed to human review (lib/domain/pipeline.ts), so a trim is safe, not silent.
    return { ok: true, text: text.slice(0, MAX_AI_TEXT_CHARS) };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { ok: false, reason: 'error', message: `Claude API error: ${error.message}` };
    }
    return { ok: false, reason: 'error', message: 'Unexpected error calling Claude.' };
  }
}
