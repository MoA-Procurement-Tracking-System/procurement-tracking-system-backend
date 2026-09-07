import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';
import { listAuditLogs } from './audit-log.service.js';

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

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  userId: z.string().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: List audit logs
 *     tags: [Audit Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated audit logs }
 *       403: { description: Admin only }
 */
router.get('/', validate(querySchema, 'query'), async (req, res, next) => {
  try {
    res.json(
      await listAuditLogs(
        req.query as unknown as Parameters<typeof listAuditLogs>[0],
      ),
    );
  } catch (e) {
    next(e);
  }
});

export default router;
