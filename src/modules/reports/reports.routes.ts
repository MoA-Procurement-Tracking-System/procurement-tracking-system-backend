import { Router } from 'express';
import { reportsController } from './reports.controller.js';

const router = Router();

/**
 * @openapi
 * /api/reports/contracts/csv:
 *   get:
 *     summary: Export contracts dataset as a downloadable CSV file
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Optional region filter
 *     responses:
 *       200:
 *         description: CSV file download stream
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/contracts/csv', (req, res) => reportsController.exportContractsCsv(req, res));

export default router;