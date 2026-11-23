import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectPii, redactPii } from '@/lib/domain/pii';

// PR 2 of card "Strip personal details in the Co-Pilot before the AI sees them": a one-time
// migration cleans past Co-Pilot summaries. CI has no database (ADR-0016), so this test reads the
// migration's SQL and replays its patterns in JavaScript, proving they remove the same things, with
// the same placeholders, as the app's `redactPii`. Live behavior: `supabase/checks/copilot-clean-check.sql`.

const SQL = readFileSync('supabase/migrations/20261123100000_copilot_clean_past_input.sql', 'utf8');
const CODE = SQL.replace(/--[^\n]*/g, '');

/** The four (pattern, placeholder) pairs, in the order the migration applies them. */
function sqlReplacements(): { re: RegExp; placeholder: string }[] {
  const pairs = [...CODE.matchAll(/'([^']+)',\s*'(\[[A-Za-z ]+ removed\])',\s*'g'/g)];
  // Postgres word boundaries \m / \M → JavaScript \b.
  return pairs.map(([, pattern, placeholder]) => ({
    re: new RegExp(pattern.replace(/\\[mM]/g, '\\b'), 'g'),
    placeholder,
  }));
}

/** What the migration does to one summary (innermost regexp_replace first). */
function cleanLikeSql(text: string): string {
  return sqlReplacements().reduce((s, { re, placeholder }) => s.replace(re, placeholder), text);
}

describe('past Co-Pilot cleanup migration', () => {
  it('has the four replacements, in the same order and with the same placeholders as the app', () => {
    expect(sqlReplacements().map((r) => r.placeholder)).toEqual([
      '[email removed]',
      '[phone number removed]',
      '[SSN removed]',
      '[card number removed]',
    ]);
  });

  it('only updates Co-Pilot runs, and only their stored summary', () => {
    expect(CODE).toMatch(/update public\.task_run t\s+set input_summary =/);
    expect(CODE).toContain("s.key = 'governance_copilot'");
    expect(CODE.match(/\bupdate\b/gi)).toHaveLength(1);
    expect(CODE).not.toMatch(/\b(delete|insert|drop|alter|grant|truncate)\b/i);
  });

  it.each([
    ['an email', 'Write to jane.doe@example.org about the drive'],
    ['a dashed phone', 'Call 555-555-0199 tomorrow'],
    ['a bracketed phone', 'Call (555) 555-0123 tomorrow'],
    ['an SSN', 'Client SSN 123-45-6789 on file'],
    ['a card number', 'Card 4111 1111 1111 1111 was charged'],
    ['everything at once', 'jane@example.org, 555-555-0199, 123-45-6789, 4111-1111-1111-1111'],
  ])('removes %s exactly as the app does', (_label, text) => {
    const sqlResult = cleanLikeSql(text);
    expect(sqlResult).toBe(redactPii(text).redacted);
    expect(detectPii(sqlResult)).toEqual([]);
  });

  it('leaves text without personal details unchanged', () => {
    const text = 'Can we use AI to draft our monthly newsletter for 120 volunteers?';
    expect(cleanLikeSql(text)).toBe(text);
  });

  it('removes any 13–19 digit run, even one that fails the card checksum (documented difference)', () => {
    const text = 'Reference 1234 5678 9012 3456 for the grant';
    expect(redactPii(text).redacted).toBe(text); // the app keeps it: not a valid card number
    expect(cleanLikeSql(text)).toBe('Reference [card number removed] for the grant');
  });

  it('only selects rows that still contain something to remove (safe to re-run)', () => {
    expect(CODE).toMatch(/and t\.input_summary ~ \(/);
  });
});
