import { Router } from 'express';
import type { RequestHandler } from 'express';
import { alertsController } from './alerts.controller.js';
import { prisma } from '../../config/database.js';
import { hashToken } from '../auth/auth.security.js';
import { env } from '../../config/env.js';
import './alerts.schema.js';

const router = Router();

function cookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const item of cookieHeader.split(';')) {
    const [k, ...rest] = item.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

const tryLoadSession: RequestHandler = async (req, _res, next) => {
  try {
    let raw: string | undefined = undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      raw = authHeader.slice(7).trim();
    }
    if (!raw) {
      raw = cookieValue(req.headers.cookie, env.SESSION_COOKIE_NAME);
    }
    if (raw) {
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashToken(raw) },
        include: { user: true },
      });
      if (
        session &&
        !session.revokedAt &&
        session.expiresAt > new Date() &&
        session.user.isActive
      ) {
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
      }
    }
  } catch {
    // Ignore session load failure and proceed
  }
  next();
};

router.use(tryLoadSession);

router.get('/', (req, res) => alertsController.getAlerts(req, res));
router.post('/', (req, res) => alertsController.createAlert(req, res));
router.patch('/read-all', (req, res) =>
  alertsController.markAllAsRead(req, res),
);
router.get('/:id', (req, res) => alertsController.getAlertById(req, res));
router.patch('/:id', (req, res) => alertsController.updateAlert(req, res));
router.patch('/:id/read', (req, res) =>
  alertsController.markAlertAsRead(req, res),
);
router.delete('/:id', (req, res) => alertsController.deleteAlert(req, res));

export default router;
