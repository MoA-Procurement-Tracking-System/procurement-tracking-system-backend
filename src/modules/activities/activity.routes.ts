import { Router } from 'express';
// import { authorize } from '../../middleware/authorize.js';
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
} from './activity.controller.js';

const router = Router();

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: List all active procurement activities
 *     tags: [Activities]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *         description: Filter activities by plan ID
 *     responses:
 *       200: { description: List of activities }
 */
router.get('/', getActivities);

/**
 * @swagger
 * /api/activities/{id}:
 *   get:
 *     summary: Get a procurement activity by ID
 *     tags: [Activities]
 *     security: [{ bearerAuth: [] }]
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
 *     summary: Create a new procurement activity in a plan
 *     tags: [Activities]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId, reference, procurementMethodId, estimatedBudget]
 *             properties:
 *               planId: { type: string }
 *               reference: { type: string }
 *               description: { type: string }
 *               procurementMethodId: { type: string }
 *               marketApproach: { type: string }
 *               qualificationApproach: { type: string }
 *               reviewType: { type: string }
 *               estimatedBudget: { type: number }
 *               currency: { type: string }
 *               fundingSource: { type: string }
 *               loanGrantNumbers:
 *                 type: array
 *                 items: { type: string }
 *               components:
 *                 type: array
 *                 items: { type: string }
 *               lotRequired: { type: boolean }
 *               lots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     lotNumber: { type: string }
 *                     description: { type: string }
 *                     estimatedAmount: { type: number }
 *     responses:
 *       201: { description: Activity created }
 */
router.post(
  '/',
  // authorize('Administrator', 'ProcurementOfficer'),
  createActivity,
);

/**
 * @swagger
 * /api/activities/{id}:
 *   patch:
 *     summary: Update an existing procurement activity
 *     tags: [Activities]
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
 *               reference: { type: string }
 *               description: { type: string }
 *               procurementMethodId: { type: string }
 *               estimatedBudget: { type: number }
 *               processStatus: { type: string }
 *     responses:
 *       200: { description: Activity updated }
 */
router.patch(
  '/:id',
  // authorize('Administrator', 'ProcurementOfficer', 'Director'),
  updateActivity,
);

export default router;
