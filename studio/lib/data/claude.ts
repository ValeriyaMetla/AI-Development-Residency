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

export type DraftResult =
  { ok: true; text: string } | { ok: false; reason: 'refused' | 'error'; message: string };

/**
 * Ask Claude for a draft. Returns a tagged result so callers can degrade
 * gracefully (ADR-14 / Q4): a safety refusal and an API error are both handled,
 * never thrown past this layer.
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
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }],
    });

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

    return { ok: true, text };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { ok: false, reason: 'error', message: `Claude API error: ${error.message}` };
    }
    return { ok: false, reason: 'error', message: 'Unexpected error calling Claude.' };
  }
}
