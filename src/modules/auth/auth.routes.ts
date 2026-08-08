import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import {
  SessionKind,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';
import {
  generateOpaqueToken,
  generateTemporaryPassword,
  hashPassword,
  hashToken,
  validatePassword,
  verifyPassword,
} from './auth.security.js';

const INVALID_LOGIN_MESSAGE = 'Unable to sign in with those credentials.';
const GENERIC_RESET_MESSAGE =
  'If an active account matches that address, password reset instructions will be sent.';

type PublicUser = {
  id: string;
  email: string;
  username: string | null;
  displayName: string;
  role: UserRole;
};

type RequestAuth = {
  sessionId: string;
  sessionKind: SessionKind;
  sessionExpiresAt: Date;
  user: PublicUser & { status: UserStatus; passwordHash: string };
};

declare global {
  // Express request typing uses declaration merging by design.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: RequestAuth;
    }
  }
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(1).max(128),
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'The password confirmation does not match.',
    path: ['confirmPassword'],
  });

const forgotPasswordSchema = z.object({ email: z.email().max(254) });
const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(256),
    newPassword: z.string().min(1).max(128),
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'The password confirmation does not match.',
    path: ['confirmPassword'],
  });

const createUserSchema = z.object({
  email: z.email().max(254),
  username: z.string().trim().min(3).max(80).optional(),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum([
    UserRole.OFFICER,
    UserRole.DIRECTOR,
    UserRole.ENDORSING_COMMITTEE,
  ]),
});

function publicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

function clientDetails(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent')?.slice(0, 500) ?? null,
  };
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

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
    priority: 'high',
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

async function audit(
  event: string,
  success: boolean,
  req: Request,
  values: {
    userId?: string;
    email?: string;
    metadata?: Record<string, string>;
  } = {},
) {
  try {
    await prisma.authAuditLog.create({
      data: {
        event,
        success,
        ...(values.email ? { email: values.email } : {}),
        ...(values.userId ? { userId: values.userId } : {}),
        ...(values.metadata ? { metadata: values.metadata } : {}),
        ...clientDetails(req),
      },
    });
  } catch (error) {
    logger.error({ error, event }, 'Could not write authentication audit log');
  }
}

function expiresFromNow(milliseconds: number): Date {
  return new Date(Date.now() + milliseconds);
}

async function createSession(
  userId: string,
  kind: SessionKind,
  rememberMe: boolean,
  req: Request,
) {
  const { raw, hash } = generateOpaqueToken();
  const duration =
    kind === SessionKind.PASSWORD_CHANGE
      ? env.PASSWORD_CHANGE_SESSION_MINUTES * 60_000
      : rememberMe
        ? env.REMEMBER_SESSION_DAYS * 86_400_000
        : env.SESSION_HOURS * 3_600_000;
  const expiresAt = expiresFromNow(duration);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hash,
      kind,
      expiresAt,
      ...clientDetails(req),
    },
  });
  return { id: session.id, raw, expiresAt };
}

const loadSession: RequestHandler = async (req, res, next) => {
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
    session.user.status !== UserStatus.ACTIVE
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
      ...publicUser(session.user),
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

const requireAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.auth || req.auth.sessionKind !== SessionKind.AUTHENTICATED) {
    res.status(403).json({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Change the temporary password before continuing.',
    });
    return;
  }
  next();
};

function requireRole(role: UserRole): RequestHandler {
  return (req, res, next) => {
    if (req.auth?.user.role !== role) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You do not have access to this resource.',
      });
      return;
    }
    next();
  };
}

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ message: INVALID_LOGIN_MESSAGE });
    return;
  }

  const identifier = parsed.data.identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });
  const passwordValid = await verifyPassword(
    parsed.data.password,
    user?.passwordHash,
  );
  const now = new Date();
  const blocked =
    !user ||
    !passwordValid ||
    user.status !== UserStatus.ACTIVE ||
    Boolean(user.lockedUntil && user.lockedUntil > now) ||
    Boolean(
      user.mustChangePassword &&
      user.tempPasswordExpiresAt &&
      user.tempPasswordExpiresAt <= now,
    );

  if (blocked) {
    if (
      user &&
      user.status === UserStatus.ACTIVE &&
      (!user.lockedUntil || user.lockedUntil <= now)
    ) {
      const nextAttempts = passwordValid
        ? user.failedLoginAttempts
        : user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts:
            nextAttempts >= env.LOGIN_MAX_ATTEMPTS ? 0 : nextAttempts,
          lockedUntil:
            nextAttempts >= env.LOGIN_MAX_ATTEMPTS
              ? expiresFromNow(env.LOGIN_LOCK_MINUTES * 60_000)
              : null,
        },
      });
    }
    await audit('LOGIN_FAILED', false, req, {
      email: identifier,
      ...(user ? { userId: user.id } : {}),
    });
    res.status(401).json({ message: INVALID_LOGIN_MESSAGE });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  const kind = user.mustChangePassword
    ? SessionKind.PASSWORD_CHANGE
    : SessionKind.AUTHENTICATED;
  const session = await createSession(
    user.id,
    kind,
    parsed.data.rememberMe,
    req,
  );
  setSessionCookie(res, session.raw, session.expiresAt);
  await audit('LOGIN_SUCCEEDED', true, req, {
    userId: user.id,
    email: user.email,
  });
  res.json({
    status:
      kind === SessionKind.PASSWORD_CHANGE
        ? 'PASSWORD_CHANGE_REQUIRED'
        : 'AUTHENTICATED',
    user: publicUser(user),
    expiresAt: session.expiresAt,
  });
});

authRouter.get('/session', loadSession, (req, res) => {
  const auth = req.auth!;
  res.json({
    status:
      auth.sessionKind === SessionKind.PASSWORD_CHANGE
        ? 'PASSWORD_CHANGE_REQUIRED'
        : 'AUTHENTICATED',
    user: publicUser(auth.user),
    expiresAt: auth.sessionExpiresAt,
  });
});

authRouter.post('/change-password', loadSession, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Check the password fields.',
    });
    return;
  }

  const auth = req.auth!;
  const currentValid = await verifyPassword(
    parsed.data.currentPassword,
    auth.user.passwordHash,
  );
  if (!currentValid) {
    await audit('PASSWORD_CHANGE_FAILED', false, req, { userId: auth.user.id });
    res.status(400).json({ message: 'The current password is incorrect.' });
    return;
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    res.status(400).json({
      message: 'The new password must be different from the current password.',
    });
    return;
  }

  const identifiers = [
    auth.user.email.split('@')[0] ?? '',
    auth.user.username ?? '',
    ...auth.user.displayName.split(/\s+/),
  ];
  const policyErrors = validatePassword(parsed.data.newPassword, identifiers);
  if (policyErrors.length > 0) {
    res.status(400).json({ message: policyErrors.join(' ') });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const replacement = generateOpaqueToken();
  const expiresAt = expiresFromNow(env.SESSION_HOURS * 3_600_000);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: auth.user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        tempPasswordExpiresAt: null,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.session.updateMany({
      where: { userId: auth.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.session.create({
      data: {
        userId: auth.user.id,
        tokenHash: replacement.hash,
        kind: SessionKind.AUTHENTICATED,
        expiresAt,
        ...clientDetails(req),
      },
    }),
  ]);
  setSessionCookie(res, replacement.raw, expiresAt);
  await audit('PASSWORD_CHANGED', true, req, { userId: auth.user.id });
  res.json({ status: 'AUTHENTICATED', user: publicUser(auth.user), expiresAt });
});

authRouter.post('/logout', async (req, res) => {
  const raw = cookieValue(req.headers.cookie, env.SESSION_COOKIE_NAME);
  if (raw) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(raw) },
    });
    if (session && !session.revokedAt) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      await audit('LOGOUT', true, req, { userId: session.userId });
    }
  }
  clearSessionCookie(res);
  res.status(204).send();
});

authRouter.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  const email = parsed.success ? parsed.data.email.toLowerCase() : '';
  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  if (user?.status === UserStatus.ACTIVE) {
    const token = generateOpaqueToken();
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: token.hash,
        expiresAt: expiresFromNow(env.PASSWORD_RESET_MINUTES * 60_000),
      },
    });
    const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token.raw)}`;
    if (env.PASSWORD_RESET_WEBHOOK_URL) {
      try {
        const delivery = await fetch(env.PASSWORD_RESET_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ to: user.email, resetUrl }),
        });
        if (!delivery.ok)
          throw new Error(`Password reset webhook returned ${delivery.status}`);
      } catch (error) {
        logger.error(
          { error, userId: user.id },
          'Password reset delivery failed',
        );
      }
    } else if (env.NODE_ENV !== 'production') {
      logger.warn(
        { email: user.email, resetUrl },
        'Development password reset link',
      );
    } else {
      logger.error(
        'PASSWORD_RESET_WEBHOOK_URL is required to deliver reset links in production',
      );
    }
    await audit('PASSWORD_RESET_REQUESTED', true, req, {
      userId: user.id,
      email,
    });
  } else {
    await verifyPassword('timing-equalization');
    await audit('PASSWORD_RESET_REQUESTED', false, req, { email });
  }

  res.json({ message: GENERIC_RESET_MESSAGE });
});

authRouter.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message:
        parsed.error.issues[0]?.message ?? 'The reset request is invalid.',
    });
    return;
  }
  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    include: { user: true },
  });
  if (
    !reset ||
    reset.usedAt ||
    reset.expiresAt <= new Date() ||
    reset.user.status !== UserStatus.ACTIVE
  ) {
    res
      .status(400)
      .json({ message: 'This password reset link is invalid or has expired.' });
    return;
  }

  const identifiers = [
    reset.user.email.split('@')[0] ?? '',
    reset.user.username ?? '',
    ...reset.user.displayName.split(/\s+/),
  ];
  const policyErrors = validatePassword(parsed.data.newPassword, identifiers);
  if (policyErrors.length > 0) {
    res.status(400).json({ message: policyErrors.join(' ') });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        tempPasswordExpiresAt: null,
        passwordChangedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: now },
    }),
    prisma.session.updateMany({
      where: { userId: reset.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
  await audit('PASSWORD_RESET_COMPLETED', true, req, { userId: reset.userId });
  res.json({ message: 'Password reset. You can now sign in.' });
});

export const adminRouter = Router();
adminRouter.use(loadSession, requireAuthenticated, requireRole(UserRole.ADMIN));
adminRouter.post('/users', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? 'Check the user details.',
    });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        username: parsed.data.username?.toLowerCase() ?? null,
        displayName: parsed.data.displayName,
        role: parsed.data.role,
        passwordHash,
        mustChangePassword: true,
        tempPasswordExpiresAt: expiresFromNow(
          env.TEMP_PASSWORD_HOURS * 3_600_000,
        ),
      },
    });
    await audit('USER_PROVISIONED', true, req, {
      userId: user.id,
      email,
      metadata: { role: user.role, provisionedBy: req.auth!.user.id },
    });
    res.status(201).json({
      user: publicUser(user),
      temporaryPassword,
      temporaryPasswordExpiresAt: user.tempPasswordExpiresAt,
      message:
        'Share this one-time password securely. It will not be shown again.',
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'P2002') {
      res.status(409).json({
        message: 'A user with that email or username already exists.',
      });
      return;
    }
    throw error;
  }
});

export const protectedRouter = Router();
protectedRouter.use(loadSession, requireAuthenticated);
protectedRouter.get('/me', (req, res) => {
  res.json({ user: publicUser(req.auth!.user) });
});

export const authErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  void _next;
  logger.error({ error }, 'Unhandled API error');
  res.status(500).json({ message: 'The request could not be completed.' });
};
