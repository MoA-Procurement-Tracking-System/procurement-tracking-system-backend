import jwt, { type SignOptions } from 'jsonwebtoken';

type Role =
  | 'ProcurementOfficer'
  | 'ProcurementDirector'
  | 'Administrator'
  | 'ManagementTeam'
  | 'ProjectManager';

type AccessTokenPayload = {
  sub: string;
  role: Role;
  type: 'access';
};

type RefreshTokenPayload = {
  sub: string;
  type: 'refresh';
};

const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';

const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ||
  '15m') as SignOptions['expiresIn'];

const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ||
  '7d') as SignOptions['expiresIn'];

export function generateAccessToken(userId: string, role: Role): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    role,
    type: 'access',
  };

  const options: SignOptions = {
    expiresIn: accessExpiresIn ?? '15m',
  };

  return jwt.sign(payload, accessSecret, options);
}

export function generateRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    type: 'refresh',
  };

  const options: SignOptions = {
    expiresIn: refreshExpiresIn ?? '7d',
  };

  return jwt.sign(payload, refreshSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshSecret) as RefreshTokenPayload;
}
