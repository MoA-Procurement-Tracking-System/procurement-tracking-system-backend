import { Router } from 'express';
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
router.post(
  '/',
  // authorize('Administrator', 'ProjectManager', 'ProcurementOfficer'),
  createPlan,
);

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
router.patch(
  '/:id',
  // authorize('Administrator', 'ProjectManager', 'ProcurementOfficer', 'Director'),
  updatePlan,
);

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
router.post(
  '/:id/submit',
  // authorize('ProcurementOfficer'),
  submitPlan,
);

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

export default router;
