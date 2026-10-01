import bcrypt from 'bcryptjs';
import { scrypt, timingSafeEqual } from 'node:crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function verifyScrypt(password: string, encodedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parts = encodedHash.split('$');
      if (parts.length !== 7 || parts[0] !== 'scrypt') return resolve(false);
      const salt = Buffer.from(parts[5] ?? '', 'base64url');
      const expected = Buffer.from(parts[6] ?? '', 'base64url');
      scrypt(
        password,
        salt,
        64,
        { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
        (err, actual) => {
          if (err) return resolve(false);
          resolve(timingSafeEqual(actual, expected));
        },
      );
    } catch {
      resolve(false);
    }
  });
}

export async function comparePassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) return false;
  if (passwordHash.startsWith('scrypt$')) {
    return verifyScrypt(password, passwordHash);
  }
  return bcrypt.compare(password, passwordHash);
}
