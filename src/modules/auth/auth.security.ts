import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const DUMMY_HASH = `scrypt$v1$${SCRYPT_COST}$${SCRYPT_BLOCK_SIZE}$${SCRYPT_PARALLELIZATION}$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(SCRYPT_KEY_LENGTH).toString('base64url')}`;

const commonPasswords = new Set([
  'password',
  'password1',
  'password123',
  'admin123',
  'administrator',
  'qwerty123',
  'welcome123',
  'temporary123',
]);

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return [
    'scrypt',
    'v1',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  encodedHash?: string | null,
): Promise<boolean> {
  const value = encodedHash ?? DUMMY_HASH;
  const parts = value.split('$');
  if (parts.length !== 7 || parts[0] !== 'scrypt' || parts[1] !== 'v1') {
    await deriveKey(password, Buffer.alloc(16));
    return false;
  }

  const salt = Buffer.from(parts[5] ?? '', 'base64url');
  const expected = Buffer.from(parts[6] ?? '', 'base64url');
  if (salt.length !== 16 || expected.length !== SCRYPT_KEY_LENGTH) {
    await deriveKey(password, Buffer.alloc(16));
    return false;
  }

  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}

export function validatePassword(
  password: string,
  identifiers: string[] = [],
): string[] {
  const errors: string[] = [];
  if (password.length < 12) errors.push('Use at least 12 characters.');
  if (password.length > 128) errors.push('Use no more than 128 characters.');
  if (!/[a-z]/.test(password)) errors.push('Add a lowercase letter.');
  if (!/[A-Z]/.test(password)) errors.push('Add an uppercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Add a number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Add a symbol.');
  if (commonPasswords.has(password.toLowerCase()))
    errors.push('Choose a less common password.');

  const normalized = password.toLowerCase();
  if (
    identifiers
      .map((identifier) => identifier.trim().toLowerCase())
      .filter((identifier) => identifier.length >= 4)
      .some((identifier) => normalized.includes(identifier))
  ) {
    errors.push(
      'Do not include your name, username, or email in the password.',
    );
  }
  return errors;
}

export function generateTemporaryPassword(): string {
  return `${randomBytes(18).toString('base64url')}aA1!`;
}

export function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('base64url');
}
