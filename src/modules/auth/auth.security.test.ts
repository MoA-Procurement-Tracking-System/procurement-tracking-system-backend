import { describe, expect, it } from 'vitest';
import {
  generateOpaqueToken,
  generateTemporaryPassword,
  hashPassword,
  hashToken,
  validatePassword,
  verifyPassword,
} from './auth.security.js';

describe('authentication security helpers', () => {
  it('hashes and verifies a password without storing the original', async () => {
    const encoded = await hashPassword('Long-Example-Password1!');
    expect(encoded).not.toContain('Long-Example-Password1!');
    await expect(
      verifyPassword('Long-Example-Password1!', encoded),
    ).resolves.toBe(true);
    await expect(verifyPassword('Wrong-Password1!', encoded)).resolves.toBe(
      false,
    );
    await expect(verifyPassword('Any-Password1!', null)).resolves.toBe(false);
  });

  it('rejects weak and identifier-derived passwords', () => {
    expect(validatePassword('password')).not.toHaveLength(0);
    expect(validatePassword('Officer-Account1!', ['officer'])).toContain(
      'Do not include your name, username, or email in the password.',
    );
    expect(validatePassword('Correct-Horse7!Battery')).toEqual([]);
  });

  it('generates unique one-time credentials and hashes opaque tokens', () => {
    const firstPassword = generateTemporaryPassword();
    const secondPassword = generateTemporaryPassword();
    expect(firstPassword).not.toBe(secondPassword);
    expect(validatePassword(firstPassword)).toEqual([]);

    const token = generateOpaqueToken();
    expect(token.raw).not.toBe(token.hash);
    expect(hashToken(token.raw)).toBe(token.hash);
  });
});
