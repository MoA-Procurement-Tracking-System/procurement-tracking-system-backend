import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtRole =
  | 'OFFICER'
  | 'DIRECTOR'
  | 'ENDORSING_COMMITTEE'
  | 'MANAGEMENT'
  | 'ADMIN'
  | 'ProcurementOfficer'
  | 'ProcurementDirector'
  | 'Administrator'
  | 'ManagementTeam'
  | 'ProjectManager'
  | string;

type AccessTokenPayload = { sub: string; role: JwtRole; type: 'access' };
type RefreshTokenPayload = { sub: string; type: 'refresh' };

function signOptions(expiresIn: string): SignOptions {
  return { expiresIn: expiresIn as unknown as number };
}

export function generateAccessToken(userId: string, role: JwtRole): string {
  return jwt.sign(
    { sub: userId, role, type: 'access' } satisfies AccessTokenPayload,
    env.JWT_ACCESS_SECRET,
    signOptions(env.JWT_ACCESS_EXPIRES_IN),
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    signOptions(env.JWT_REFRESH_EXPIRES_IN),
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
