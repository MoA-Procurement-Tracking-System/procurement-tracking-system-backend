import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';

const router = Router();

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     summary: Get high-level financial summary metrics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Optional region filter
 *     responses:
 *       200:
 *         description: Dashboard financial aggregates and active contract count
 */
router.get('/summary', (req, res) => dashboardController.getSummary(req, res));

/**
 * @openapi
 * /api/dashboard/by-activity:
 *   get:
 *     summary: Get funding metrics grouped by activity
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Optional region filter
 *     responses:
 *       200:
 *         description: Array of activity funding breakdowns
 */
router.get('/by-activity', (req, res) =>
  dashboardController.getByActivity(req, res),
);

export default router;
