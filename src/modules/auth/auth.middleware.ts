import { type RequestHandler } from 'express';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import {
  SessionKind,
  UserStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { hashToken } from './auth.security.js';

export type PublicUser = {
  id: string;
  email: string;
  username: string | null;
  displayName: string;
  role: UserRole;
};

export type RequestAuth = {
  sessionId: string;
  sessionKind: SessionKind;
  sessionExpiresAt: Date;
  user: PublicUser & { status: UserStatus; passwordHash: string | null };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: RequestAuth;
    }
  }
}

function cookieValue(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const value of header.split(';')) {
    const separator = value.indexOf('=');
    if (separator < 0) continue;
    const key = value.slice(0, separator).trim();
    if (key === name)
      return decodeURIComponent(value.slice(separator + 1).trim());
  }
  return undefined;
}

function clearSessionCookie(res: import('express').Response) {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

export const loadSession: RequestHandler = async (req, res, next) => {
  const raw = cookieValue(req.headers.cookie, env.SESSION_COOKIE_NAME);
  if (!raw) {
    clearSessionCookie(res);
    res
      .status(401)
      .json({ code: 'UNAUTHENTICATED', message: 'Sign in is required.' });
    return;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  });
  const now = new Date();
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.user.status !== UserStatus.ACTIVE ||
    !session.user.isActive
  ) {
    if (session && !session.revokedAt) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
    }
    clearSessionCookie(res);
    res.status(401).json({
      code: 'UNAUTHENTICATED',
      message: 'Your session has ended. Sign in again.',
    });
    return;
  }

  req.auth = {
    sessionId: session.id,
    sessionKind: session.kind,
    sessionExpiresAt: session.expiresAt,
    user: {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      displayName: session.user.displayName,
      role: session.user.authRole,
      status: session.user.status,
      passwordHash: session.user.passwordHash,
    },
  };
  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });
  next();
};

export const requireAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.auth || req.auth.sessionKind !== SessionKind.AUTHENTICATED) {
    res.status(403).json({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Change the temporary password before continuing.',
    });
    return;
  }
  next();
};
