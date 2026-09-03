import { Router } from 'express';
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  updateStage,
  updateStageActual,
  replanStage,
} from './activity.controller.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';

const router = Router();
// Read routes do not require strict session check

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: List all active procurement activities
 *     tags: [Activities]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *         description: Filter activities by plan ID
 *     responses:
 *       200: { description: List of activities }
 *       401: { description: Unauthorized }
 */
router.get('/', getActivities);

/**
 * @swagger
 * /api/activities/{id}:
 *   get:
 *     summary: Get a procurement activity by ID
 *     tags: [Activities]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Activity found }
 *       404: { description: Activity not found }
 */
router.get('/:id', getActivityById);

/**
 * @swagger
 * /api/activities:
 *   post:
 *     summary: Create a new procurement activity
 *     tags: [Activities]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId, procurementMethodId, description, estimatedBudget, currency, fundings]
 *             properties:
 *               planId: { type: string }
 *               procurementMethodId: { type: string }
 *               description: { type: string }
 *               estimatedBudget: { type: number }
 *               currency: { type: string }
 *               marketApproach: { type: string, enum: [OPEN_INTERNATIONAL, OPEN_NATIONAL, LIMITED, DIRECT] }
 *               reviewType: { type: string, enum: [PRIOR, POST] }
 *               contractType: { type: string, enum: [LUMP_SUM, TIME_BASED] }
 *               lotRequired: { type: boolean }
 *               fundings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fundingSource: { type: string }
 *                     loanGrantNumber: { type: string }
 *                     allocationPct: { type: number }
 *     responses:
 *       201: { description: Activity created }
 *       400: { description: Validation error }
 */
router.post('/', loadSession, requireAuthenticated, createActivity);

/**
 * @swagger
 * /api/activities/{id}:
 *   patch:
 *     summary: Update an existing procurement activity
 *     tags: [Activities]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Activity updated }
 */
router.patch('/:id', loadSession, requireAuthenticated, updateActivity);

/**
 * @swagger
 * /api/activities/{id}/stages/{stageId}:
 *   patch:
 *     summary: Update planning dates for a roadmap stage
 *     tags: [Activities]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Stage updated }
 */
router.patch(
  '/:id/stages/:stageId',
  loadSession,
  requireAuthenticated,
  updateStage,
);

/**
 * @swagger
 * /api/activities/{id}/stages/{stageId}/actual:
 *   patch:
 *     summary: Record actual dates for a completed roadmap stage
 *     tags: [Activities]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Actual dates recorded }
 */
router.patch(
  '/:id/stages/:stageId/actual',
  loadSession,
  requireAuthenticated,
  updateStageActual,
);

/**
 * @swagger
 * /api/activities/{id}/stages/{stageId}/replan:
 *   post:
 *     summary: Replan a stage with a revised date and reason (creates revision record)
 *     tags: [Activities]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [revisedStartDate, reason]
 *             properties:
 *               revisedStartDate: { type: string, format: date }
 *               revisedEndDate: { type: string, format: date }
 *               reason: { type: string, minLength: 10 }
 *     responses:
 *       200: { description: Stage replanned with revision history }
 */
router.post(
  '/:id/stages/:stageId/replan',
  loadSession,
  requireAuthenticated,
  replanStage,
);

export default router;
