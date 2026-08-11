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
 * /api/dashboard/by-sector:
 *   get:
 *     summary: Get funding metrics grouped by sector
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Optional region filter
 *     responses:
 *       200:
 *         description: Array of sector funding breakdowns
 */
router.get('/by-sector', (req, res) => dashboardController.getBySector(req, res));

export default router;