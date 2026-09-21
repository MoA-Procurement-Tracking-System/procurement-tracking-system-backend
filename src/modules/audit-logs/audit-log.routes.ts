import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';
import { listAuditLogs } from './audit-log.service.js';
import { auditLogQuerySchema } from './audit-log.schema.js';

const router = Router();

const bridgeAuth: RequestHandler = (req, _res, next) => {
  if (req.auth?.user) {
    const roleMap: Record<string, string> = {
      ADMIN: 'Administrator',
      OFFICER: 'ProcurementOfficer',
      DIRECTOR: 'ProcurementDirector',
      ENDORSING_COMMITTEE: 'ManagementTeam',
      MANAGEMENT: 'ManagementTeam',
    };
    const userAuthRole = req.auth.user.role;
    (req as unknown as Record<string, unknown>).user = {
      id: req.auth.user.id,
      role: roleMap[userAuthRole] || userAuthRole,
    };
  }
  next();
};

router.use(
  loadSession,
  requireAuthenticated,
  bridgeAuth,
  authorize('Administrator'),
);

router.get(
  '/',
  validate(auditLogQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      res.json(
        await listAuditLogs(
          req.query as unknown as Parameters<typeof listAuditLogs>[0],
        ),
      );
    } catch (e) {
      next(e);
    }
  },
);

export default router;
