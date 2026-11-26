/**
 * Draft cleanup (Domain layer, ADR-0003) — PURE and DETERMINISTIC, code outside the model.
 *
 * A Skill draft is shown to people and copied into real emails and letters, so it should be clean
 * plain prose. The model sometimes ignores "return only the note text" and adds markdown emphasis
 * (literal **asterisks**) or a self-attribution sign-off ("Drafted with AI assistance."). The app
 * already states provenance honestly from run state (lib/domain/provenance.ts), so a model-written
 * AI sign-off is both redundant and not under our control. This strips that noise deterministically
 * — never trusting the model to comply — so the stored and shown draft is clean.
 *
 * Conservative by design: it removes a line ONLY when the whole line is an AI attribution, so a
 * sentence that merely mentions AI (e.g. "Thank you for supporting our AI literacy program.") is
 * kept untouched.
 */

// A whole line that is the model attributing the draft to AI — removed (the app owns provenance).
// Allows leading markdown markers/quote/dash so "*Drafted with AI assistance.*" is caught too.
const AI_SIGNOFF_LINE =
  /^[\s*_>-]*(?:(?:drafted|written|composed|created|generated|prepared)\s+(?:with|by|using)\s+(?:the\s+help\s+of\s+)?(?:ai|a\.i\.|artificial intelligence|claude)|ai[-\s]?(?:generated|assisted|written))\b[^\n]*$/i;

/** Strip stray markdown emphasis and any AI-attribution sign-off line from a model draft. */
export function cleanDraft(text: string): string {
  const kept = text.split('\n').filter((line) => !AI_SIGNOFF_LINE.test(line));
  const stripped = kept
    .join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** -> bold
    .replace(/\*([^*\n]+)\*/g, '$1'); // *italic* -> italic
  return stripped
    .replace(/[ \t]+$/gm, '') // trailing spaces left behind
    .replace(/\n{3,}/g, '\n\n') // collapse gaps where a sign-off line was removed
    .trim();
}
