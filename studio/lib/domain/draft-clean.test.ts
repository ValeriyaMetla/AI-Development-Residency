import { describe, it, expect } from 'vitest';
import { cleanDraft } from './draft-clean';

describe('cleanDraft', () => {
  it('strips bold and italic asterisk emphasis, keeping the words', () => {
    expect(cleanDraft('Thank you **so much**, Maria.')).toBe('Thank you so much, Maria.');
    expect(cleanDraft('Your *generous* gift means a lot.')).toBe('Your generous gift means a lot.');
  });

  it('removes a model-added AI sign-off line (with or without asterisks)', () => {
    expect(cleanDraft('Dear friend, thank you.\n\nDrafted with AI assistance.')).toBe(
      'Dear friend, thank you.',
    );
    expect(cleanDraft('Dear friend, thank you.\n\n*Drafted with AI assistance.*')).toBe(
      'Dear friend, thank you.',
    );
    expect(cleanDraft('Thanks!\nAI-generated draft')).toBe('Thanks!');
  });

  it('keeps a normal note untouched', () => {
    const note = 'Dear Maria,\n\nThank you for your generous gift. It makes a real difference.';
    expect(cleanDraft(note)).toBe(note);
  });

  it('keeps a sentence that merely mentions AI (only whole-line attributions are removed)', () => {
    const note = 'Thank you for supporting our AI literacy program this year.';
    expect(cleanDraft(note)).toBe(note);
  });

  it('is a no-op on already-clean text and trims surrounding whitespace', () => {
    expect(cleanDraft('  Simple thanks.  ')).toBe('Simple thanks.');
    expect(cleanDraft('')).toBe('');
  });
});
