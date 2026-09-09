import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { hashToken } from '../modules/auth/auth.security.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/errors.js';
import { UserRole, UserStatus } from '../generated/prisma/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  displayName: string;
  role: UserRole | string;
  authRole: UserRole | string;
  status: UserStatus | string;
  mustChangePassword: boolean;
}

function parseCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      token = parseCookie(req.headers.cookie, env.SESSION_COOKIE_NAME);
    }

    if (!token) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const now = new Date();
    // 1. Try resolving as opaque session token (primary mechanism used by login and frontend)
    const tokenHash = hashToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (session) {
      if (
        session.revokedAt ||
        session.expiresAt <= now ||
        session.user.status !== UserStatus.ACTIVE ||
        !session.user.isActive
      ) {
        if (!session.revokedAt && session.expiresAt <= now) {
          await prisma.session
            .update({
              where: { id: session.id },
              data: { revokedAt: now },
            })
            .catch(() => {});
        }
        return next(ApiError.unauthorized('Session has expired or is invalid'));
      }

      const authUser: AuthenticatedUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || session.user.displayName,
        displayName: session.user.displayName,
        role:
          session.user.authRole ||
          (session.user as { role?: string }).role ||
          'OFFICER',
        authRole: session.user.authRole,
        status: session.user.status,
        mustChangePassword: session.user.mustChangePassword,
      };

      req.user = authUser;
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

      // Touch session activity asynchronously
      prisma.session
        .update({
          where: { id: session.id },
          data: { lastSeenAt: now },
        })
        .catch(() => {});

      return next();
    }

    // 2. Fallback: Check if token is a valid JWT access token
    if (token.split('.').length === 3) {
      try {
        const payload = verifyAccessToken(token);
        if (payload.type === 'access' && payload.sub) {
          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
          });

          if (user && user.isActive && user.status === UserStatus.ACTIVE) {
            req.user = {
              id: user.id,
              email: user.email,
              name: user.name || user.displayName,
              displayName: user.displayName,
              role:
                user.authRole || (user as { role?: string }).role || 'OFFICER',
              authRole: user.authRole,
              status: user.status,
              mustChangePassword: user.mustChangePassword,
            };
            return next();
          }
        }
      } catch {
        // Invalid JWT
      }
    }

    return next(
      ApiError.unauthorized('Invalid or expired authentication token'),
    );
  } catch (error) {
    return next(error);
  }
};

export const requirePasswordChange: RequestHandler = (req, res, next) => {
  if (req.user?.mustChangePassword) {
    return next(
      ApiError.forbidden(
        'You must change your temporary password before proceeding',
      ),
    );
  }
  next();
};

/**
 * Role matching map across legacy PascalCase Role and canonical UserRole enums.
 */
const ROLE_EQUIVALENTS: Record<string, string[]> = {
  OFFICER: ['OFFICER', 'ProcurementOfficer'],
  ProcurementOfficer: ['OFFICER', 'ProcurementOfficer'],

  DIRECTOR: ['DIRECTOR', 'ProcurementDirector'],
  ProcurementDirector: ['DIRECTOR', 'ProcurementDirector'],

  ADMIN: ['ADMIN', 'Administrator'],
  Administrator: ['ADMIN', 'Administrator'],

  MANAGEMENT: ['MANAGEMENT', 'ManagementTeam', 'ENDORSING_COMMITTEE'],
  ManagementTeam: ['MANAGEMENT', 'ManagementTeam', 'ENDORSING_COMMITTEE'],

  ENDORSING_COMMITTEE: ['ENDORSING_COMMITTEE', 'MANAGEMENT', 'ManagementTeam'],
  ProjectManager: [
    'ProjectManager',
    'DIRECTOR',
    'OFFICER',
    'ProcurementDirector',
  ],
};

export function authorize(...allowedRoles: (UserRole | string)[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const userRole = String(req.user.role);
    const userAuthRole = String(req.user.authRole);

    // Expand allowed roles with equivalents
    const expandedAllowed = new Set(
      allowedRoles.flatMap((role) => {
        const strRole = String(role);
        return [strRole, ...(ROLE_EQUIVALENTS[strRole] || [])];
      }),
    );

    const hasPermission =
      expandedAllowed.has(userRole) ||
      expandedAllowed.has(userAuthRole) ||
      userAuthRole === 'ADMIN' ||
      userRole === 'Administrator';

    if (!hasPermission) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
}
