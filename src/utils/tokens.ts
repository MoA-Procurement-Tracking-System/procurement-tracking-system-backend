import crypto from 'node:crypto';

// Generates a cryptographically secure random token.
export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// Hashes a token before storing it in the database.
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
