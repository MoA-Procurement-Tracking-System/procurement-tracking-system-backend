import { Router, type RequestHandler } from 'express';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { hashToken } from '../auth/auth.security.js';

function cookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(name + '='));
  if (!match) return undefined;
  return decodeURIComponent(match.slice(name.length + 1));
}

const optionalLoadSession: RequestHandler = async (req, res, next) => {
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
      if (session && !session.revokedAt && session.expiresAt > new Date()) {
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
    // Ignore session load error in optional middleware
  }
  next();
};
// import { authorize } from '../../middleware/authorize.js';
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  requestPlanUpdate,
  approvePlanUpdate,
  submitPlan,
  sendToCommittee,
  rejectPlan,
  submitCommitteeVote,
  submitManagementDecision,
  returnPlanForRevision,
  getPlanComments,
  addComment,
} from './plan.controller.js';

const router = Router();

/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: List all active procurement plans
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of plans }
 */
router.get('/', getPlans);

/**
 * @swagger
 * /api/plans/{id}:
 *   get:
 *     summary: Get a procurement plan by ID
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Plan found }
 *       404: { description: Plan not found }
 */
router.get('/:id', getPlanById);

/**
 * @swagger
 * /api/plans:
 *   post:
 *     summary: Create a new procurement plan
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, title, periodStart, periodEnd]
 *             properties:
 *               projectId: { type: string }
 *               title: { type: string }
 *               budgetYear: { type: string }
 *               procurementCategory: { type: string }
 *               organization: { type: string }
 *               description: { type: string }
 *               periodStart: { type: string, format: date-time }
 *               periodEnd: { type: string, format: date-time }
 *               gpnDate: { type: string, format: date-time }
 *     responses:
 *       201: { description: Plan created }
 */
router.post('/', optionalLoadSession, createPlan);

/**
 * @swagger
 * /api/plans/{id}:
 *   patch:
 *     summary: Update an existing procurement plan
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               budgetYear: { type: string }
 *               procurementCategory: { type: string }
 *               organization: { type: string }
 *               description: { type: string }
 *               periodStart: { type: string, format: date-time }
 *               periodEnd: { type: string, format: date-time }
 *               gpnDate: { type: string, format: date-time }
 *               status: { type: string, enum: [DRAFT, SUBMITTED, APPROVED, REJECTED] }
 *     responses:
 *       200: { description: Plan updated }
 */
router.patch('/:id', optionalLoadSession, updatePlan);

/**
 * @swagger
 * /api/plans/{id}/request-update:
 *   post:
 *     summary: Request permission to update an approved plan
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Update requested }
 */
router.post(
  '/:id/request-update',
  // authorize('ProcurementOfficer'),
  requestPlanUpdate,
);

/**
 * @swagger
 * /api/plans/{id}/approve-update:
 *   post:
 *     summary: Approve a request to update a plan
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Update approved }
 */
router.post(
  '/:id/approve-update',
  // authorize('Director', 'Administrator'),
  approvePlanUpdate,
);

/**
 * @swagger
 * /api/plans/{id}/submit:
 *   post:
 *     summary: Submit a draft plan for review
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Plan submitted }
 */
router.post('/:id/submit', optionalLoadSession, submitPlan);

/**
 * @swagger
 * /api/plans/{id}/send-to-committee:
 *   post:
 *     summary: Send a submitted plan to the endorsing committee
 *     description: Changes plan status to WITH_COMMITTEE and emails all committee members with a link to vote. Director can optionally set a voting deadline.
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voteDeadlineHours:
 *                 type: number
 *                 description: Number of hours from now until the voting deadline (e.g. 48 for 2 days)
 *                 example: 48
 *     responses:
 *       200: { description: Plan sent to committee, emails dispatched }
 */
router.post(
  '/:id/send-to-committee',
  // authorize('Director', 'Administrator'),
  sendToCommittee,
);

/**
 * @swagger
 * /api/plans/{id}/reject:
 *   post:
 *     summary: Reject a submitted plan
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Plan rejected }
 */
router.post(
  '/:id/reject',
  // authorize('Director', 'Administrator'),
  rejectPlan,
);

/**
 * @swagger
 * /api/plans/{id}/vote:
 *   post:
 *     summary: Cast a committee vote on a plan
 *     tags: [Plans]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision: { type: string, enum: [APPROVE, REJECT] }
 *               comment: { type: string }
 *     responses:
 *       200: { description: Vote recorded }
 */
router.post(
  '/:id/vote',
  // authorize('ENDORSING_COMMITTEE', 'Administrator'),
  submitCommitteeVote,
);

/**
 * @swagger
 * /api/plans/{id}/management-decision:
 *   post:
 *     summary: Record Management executive decision (APPROVE or REJECT)
 *     tags: [Plans]
 */
router.post('/:id/management-decision', submitManagementDecision);

/**
 * @swagger
 * /api/plans/{id}/return-to-officer:
 *   post:
 *     summary: Return a rejected plan to officer for revision with instructions
 *     tags: [Plans]
 */
router.post('/:id/return-to-officer', returnPlanForRevision);

/**
 * @swagger
 * /api/plans/{id}/comments:
 *   get:
 *     summary: Get all plan and activity comments
 *     tags: [Plans]
 */
router.get('/:id/comments', getPlanComments);

/**
 * @swagger
 * /api/plans/{id}/comments:
 *   post:
 *     summary: Add a comment to a plan or activity
 *     tags: [Plans]
 */
router.post('/:id/comments', addComment);

export default router;
