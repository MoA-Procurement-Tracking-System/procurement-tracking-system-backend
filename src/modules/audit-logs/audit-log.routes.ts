import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { requirePasswordChange } from '../auth/middleware/requirePasswordChange.js';
import { listAuditLogs } from './audit-log.service.js';

const router = Router();
router.use(authenticate, requirePasswordChange, authorize('Administrator'));

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  userId: z.uuid().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  action: z.string().trim().optional(),
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
