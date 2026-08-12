import { Router } from 'express';
import { alertsController } from './alerts.controller.js';

const router = Router();

/**
 * @openapi
 * /api/alerts:
 *   get:
 *     summary: Retrieve active dynamic system alerts
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Optional region filter
 *     responses:
 *       200:
 *         description: Array of dynamic alert items
 */
router.get('/', (req, res) => alertsController.getAlerts(req, res));

export default router;
