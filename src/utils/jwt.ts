import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type Role =
  | 'ProcurementOfficer'
  | 'ProcurementDirector'
  | 'Administrator'
  | 'ManagementTeam'
  | 'ProjectManager';

type AccessTokenPayload = { sub: string; role: Role; type: 'access' };
type RefreshTokenPayload = { sub: string; type: 'refresh' };

export function generateAccessToken(userId: string, role: Role): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(
    { sub: userId, role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as any,
  );
}

export function generateRefreshToken(userId: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as any);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
