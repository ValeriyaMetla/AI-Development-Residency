import { describe, it, expect } from 'vitest';
import {
  validateNewPassword,
  resetErrorMessage,
  RESET_REQUEST_CONFIRMATION,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from './password-reset';

describe('validateNewPassword', () => {
  it('rejects an empty password', () => {
    expect(validateNewPassword({ password: '', confirm: '' })).toEqual({
      ok: false,
      message: expect.any(String),
    });
  });

  it('rejects a password shorter than the minimum', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validateNewPassword({ password: short, confirm: short }).ok).toBe(false);
  });

  it('rejects a password longer than the maximum (bcrypt 72-byte ceiling)', () => {
    const long = 'a'.repeat(MAX_PASSWORD_LENGTH + 1);
    expect(validateNewPassword({ password: long, confirm: long }).ok).toBe(false);
  });

  it('rejects when the two passwords do not match', () => {
    expect(validateNewPassword({ password: 'longenough1', confirm: 'longenough2' })).toEqual({
      ok: false,
      message: 'The two passwords do not match.',
    });
  });

  it('accepts a valid matching password at the minimum length', () => {
    const pw = 'a'.repeat(MIN_PASSWORD_LENGTH);
    expect(validateNewPassword({ password: pw, confirm: pw })).toEqual({ ok: true });
  });
});

describe('resetErrorMessage', () => {
  it('maps an expired/invalid token to a plain, actionable message', () => {
    expect(resetErrorMessage('Token has expired or is invalid')).toMatch(/expired|used/i);
  });

  it('maps a weak-password error to our policy without echoing the raw text', () => {
    expect(resetErrorMessage('Password should be at least 6 characters')).toContain(
      String(MIN_PASSWORD_LENGTH),
    );
  });

  it('falls back to a generic message for unknown errors and never returns raw internals', () => {
    const msg = resetErrorMessage('ECONNREFUSED 127.0.0.1:54321 internal detail');
    expect(msg).not.toContain('ECONNREFUSED');
    expect(msg).not.toContain('127.0.0.1');
    expect(msg).toMatch(/could not|request a new/i);
  });

  it('handles empty input safely', () => {
    expect(resetErrorMessage('')).toMatch(/could not|request a new/i);
  });
});

describe('RESET_REQUEST_CONFIRMATION', () => {
  it('does not reveal whether an account exists (no enumeration)', () => {
    expect(RESET_REQUEST_CONFIRMATION.toLowerCase()).toContain('if an account exists');
  });
});
