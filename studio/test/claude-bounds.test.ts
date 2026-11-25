import { describe, it, expect, vi, beforeEach } from 'vitest';

// ADR-0003 Data-Source boundary + PenTest F-15 / SR-19: the one Claude call (draftWithClaude) must
// stop after 30s with at most 2 retries and a clean error, and cap returned AI text at 6,000 chars
// before it is stored or shown. These are Unit tests (BDD R15) — the SDK is mocked, no network.

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => {
  // A minimal stand-in for the SDK: a default-exported client whose messages.create we control,
  // plus the APIError class draftWithClaude checks with `instanceof`.
  class APIError extends Error {}
  class Anthropic {
    messages = { create: createMock };
    static APIError = APIError;
  }
  return { default: Anthropic };
});

import Anthropic from '@anthropic-ai/sdk';
import {
  draftWithClaude,
  CLAUDE_TIMEOUT_MS,
  CLAUDE_MAX_RETRIES,
  MAX_AI_TEXT_CHARS,
} from '@/lib/data/claude';

// The real APIError constructor takes (status, error, message, headers); the mock just extends Error.
// Cast to a (message) => Error shape so TS is happy, while runtime uses the mocked class — so the
// thrown value is `instanceof Anthropic.APIError` exactly as draftWithClaude checks.
const ApiError = Anthropic.APIError as unknown as new (message: string) => Error;

const textResponse = (text: string) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text }],
});

describe('draftWithClaude is bounded (F-15 / SR-19)', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('passes a 30s timeout and at most 2 retries to every call', async () => {
    createMock.mockResolvedValue(textResponse('hello'));
    await draftWithClaude('system', 'input');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 1024 }),
      expect.objectContaining({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: CLAUDE_MAX_RETRIES }),
    );
    expect(CLAUDE_TIMEOUT_MS).toBe(30_000);
    expect(CLAUDE_MAX_RETRIES).toBeLessThanOrEqual(2);
  });

  it('turns a timeout / API error into a clean tagged error, never a throw', async () => {
    createMock.mockRejectedValue(new ApiError('Request timed out.'));
    const result = await draftWithClaude('system', 'input');
    expect(result).toEqual({
      ok: false,
      reason: 'error',
      message: expect.stringContaining('Claude API error'),
    });
  });

  it('handles an unexpected (non-API) throw as a clean error too', async () => {
    createMock.mockRejectedValue(new Error('socket exploded'));
    const result = await draftWithClaude('system', 'input');
    expect(result).toEqual({ ok: false, reason: 'error', message: expect.any(String) });
  });

  it('caps returned AI text at 6,000 characters before it is returned', async () => {
    createMock.mockResolvedValue(textResponse('x'.repeat(7_000)));
    const result = await draftWithClaude('system', 'input');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text.length).toBe(MAX_AI_TEXT_CHARS);
      expect(MAX_AI_TEXT_CHARS).toBe(6_000);
    }
  });

  it('leaves text under the cap untouched', async () => {
    createMock.mockResolvedValue(textResponse('a short answer'));
    const result = await draftWithClaude('system', 'input');
    expect(result).toEqual({ ok: true, text: 'a short answer' });
  });

  it('still reports a safety refusal as reason "refused" (regression)', async () => {
    createMock.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    const result = await draftWithClaude('system', 'input');
    expect(result).toEqual({ ok: false, reason: 'refused', message: expect.any(String) });
  });
});
