import { describe, it, expect, vi, afterEach } from 'vitest';
import { POLICY_SEED_DRAFT_KEY, clearClientDraftsOnSignOut } from '@/lib/client/policy-seed-draft';

/**
 * F-11 / SR-21: signing out clears the policy-seed wizard's saved draft from the browser, so a
 * leader's in-progress answers don't survive logout on a shared computer. The helper is the single
 * source of truth for the key (the wizard imports the same constant) and must never throw — a
 * failure to clear can't be allowed to block sign-out.
 *
 * Tests run in the Node environment (no real `localStorage`), so we stub `globalThis.localStorage`.
 */

const original = globalThis.localStorage;
afterEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = original;
});

describe('clearClientDraftsOnSignOut (F-11 / SR-21)', () => {
  it('removes exactly the policy-seed wizard draft key', () => {
    const removeItem = vi.fn();
    (globalThis as { localStorage?: unknown }).localStorage = { removeItem };
    clearClientDraftsOnSignOut();
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith('policy-seed-draft-v1');
  });

  it('exposes the key the wizard stores under, so the two cannot drift', () => {
    expect(POLICY_SEED_DRAFT_KEY).toBe('policy-seed-draft-v1');
  });

  it('does not throw when storage is unavailable (server / private mode)', () => {
    (globalThis as { localStorage?: unknown }).localStorage = undefined;
    expect(() => clearClientDraftsOnSignOut()).not.toThrow();
  });

  it('does not throw when removeItem itself throws (storage disabled)', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      removeItem: () => {
        throw new Error('storage access denied');
      },
    };
    expect(() => clearClientDraftsOnSignOut()).not.toThrow();
  });
});
