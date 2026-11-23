import { describe, it, expect } from 'vitest';
import { detectPii, hasPii, piiSummary, redactPii } from '@/lib/domain/pii';

const cats = (text: string) => detectPii(text).map((f) => f.category);

describe('detectPii — high-precision categories', () => {
  it('detects an email address', () => {
    expect(cats('Reach me at jane.doe@example.org please')).toContain('email');
  });
  it('detects a separated phone number (dashes, dots, spaces, parens)', () => {
    expect(cats('Call 555-123-4567')).toContain('phone');
    expect(cats('Call 555.123.4567')).toContain('phone');
    expect(cats('Call (555) 123-4567')).toContain('phone');
  });
  it('detects a dash-formatted US SSN', () => {
    expect(cats('SSN 123-45-6789')).toContain('us_ssn');
  });
  it('detects a Luhn-valid card number (with or without spaces)', () => {
    expect(cats('card 4242424242424242')).toContain('credit_card');
    expect(cats('card 4242 4242 4242 4242')).toContain('credit_card');
  });
  it('counts multiple occurrences', () => {
    const f = detectPii('a@b.com and c@d.org').find((x) => x.category === 'email');
    expect(f?.count).toBe(2);
  });
});

describe('detectPii — keeps false-positives low', () => {
  it('finds nothing in clean text', () => {
    expect(detectPii('Thank you so much for your generous gift this year.')).toEqual([]);
    expect(hasPii('Maria, for her monthly gift and volunteering')).toBe(false);
  });
  it('does NOT treat a random 16-digit number as a card (fails Luhn)', () => {
    expect(cats('order number 1234567890123456')).not.toContain('credit_card');
  });
  it('does not confuse an SSN pattern with a phone (3-2-4 vs 3-3-4)', () => {
    expect(cats('123-45-6789')).toEqual(['us_ssn']);
    expect(cats('555-123-4567')).toEqual(['phone']);
  });
});

describe('Verify clean input passes without warnings (Epic 5) — false-positive sample', () => {
  const cleanInputs = [
    'Maria, for her $50 monthly gift and volunteering at our food drive',
    'Thank the Rotary Club for sponsoring the 2026 gala',
    'A note to James for 10 years of steady support',
    'Our reference ID is 123456789012345',
    'The event is on March 3 at 5pm, room 204',
    'We raised 1,250 dollars this quarter — thank everyone',
  ];

  it('flags zero PII across a sample of ordinary nonprofit inputs (no false positives)', () => {
    const flagged = cleanInputs.filter((t) => detectPii(t).length > 0);
    expect(flagged).toEqual([]);
  });
});

describe('piiSummary — plain language, no raw value', () => {
  it('summarizes categories without echoing the sensitive value', () => {
    const findings = detectPii('email jane.doe@example.org and SSN 123-45-6789');
    const summary = piiSummary(findings);
    expect(summary).toMatch(/email address/);
    expect(summary).toMatch(/Social Security number/);
    expect(summary).not.toContain('jane.doe@example.org');
    expect(summary).not.toContain('123-45-6789');
  });
  it('says so when nothing is found', () => {
    expect(piiSummary([])).toMatch(/no personal information/i);
  });
  it('uses "an" before a vowel and "a" before a consonant', () => {
    const summary = piiSummary(detectPii('jane.doe@example.org, 555-555-0123, SSN 123-45-6789'));
    expect(summary).toContain('an email address');
    expect(summary).toContain('a phone number');
    expect(summary).toContain('a Social Security number');
    expect(summary).not.toContain('a email');
  });
});

describe('redactPii — strip/minimize by default', () => {
  it('replaces detected PII with placeholders and removes the raw value', () => {
    const { redacted, findings } = redactPii('Email jane.doe@example.org or call 555-123-4567');
    expect(redacted).not.toContain('jane.doe@example.org');
    expect(redacted).not.toContain('555-123-4567');
    expect(redacted).toContain('[email removed]');
    expect(redacted).toContain('[phone number removed]');
    expect(findings.map((f) => f.category).sort()).toEqual(['email', 'phone']);
  });

  it('keeps the surrounding text so the task still makes sense', () => {
    const { redacted } = redactPii('Thank Maria at maria@example.org for her gift');
    expect(redacted).toBe('Thank Maria at [email removed] for her gift');
  });

  it('redacts a Luhn-valid card but leaves a non-card long number intact', () => {
    expect(redactPii('card 4242424242424242').redacted).toContain('[card number removed]');
    expect(redactPii('order 1234567890123456').redacted).toContain('1234567890123456');
  });

  it('leaves clean text unchanged with no findings', () => {
    const { redacted, findings } = redactPii('Thank you for your generous gift this year.');
    expect(redacted).toBe('Thank you for your generous gift this year.');
    expect(findings).toEqual([]);
  });

  it('keeps a category when asked (deliberate keep), still stripping the others', () => {
    const { redacted, findings } = redactPii('email a@b.com and call 555-123-4567', ['email']);
    expect(redacted).toContain('a@b.com'); // kept by choice
    expect(redacted).not.toContain('555-123-4567'); // the rest still stripped
    expect(redacted).toContain('[phone number removed]');
    // findings still report everything that was detected
    expect(findings.map((f) => f.category).sort()).toEqual(['email', 'phone']);
  });
});

describe('plural labels', () => {
  it('says "addresses", not "addresss", and counts other kinds normally', () => {
    expect(piiSummary(detectPii('a@example.org, b@example.org'))).toContain('2 email addresses');
    expect(piiSummary(detectPii('555-555-0101 and 555-555-0102'))).toContain('2 phone numbers');
    expect(piiSummary(detectPii('a@example.org, b@example.org'))).not.toContain('addresss');
  });
});
