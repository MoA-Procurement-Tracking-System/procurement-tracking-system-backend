import { Router } from 'express';
import { reportsController } from './reports.controller.js';

const router = Router();

/**
 * @openapi
 * /api/reports/detailed-procurement:
 *   get:
 *     summary: Report #7 — Detailed Procurement (Excel)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: procurementMethodId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: budgetYear
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 500, maximum: 5000 }
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema: { type: string, format: binary }
 */
router.get('/detailed-procurement', (req, res) =>
  reportsController.detailedProcurement(req, res),
);

/**
 * @openapi
 * /api/reports/annual-procurement-plan:
 *   get:
 *     summary: Report #1 — Annual Procurement Plan (Excel, 2 sheets)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: budgetYear
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 500 }
 *     responses:
 *       200:
 *         description: Excel file download
 */
router.get('/annual-procurement-plan', (req, res) =>
  reportsController.annualProcurementPlan(req, res),
);

/**
 * @openapi
 * /api/reports/procurement-steps:
 *   get:
 *     summary: Report #3 — Procurement Step tracker for one activity (Excel)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: activityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Excel file download
 */
router.get('/procurement-steps', (req, res) =>
  reportsController.procurementSteps(req, res),
);

/**
 * @openapi
 * /api/reports/plan-vs-actual:
 *   get:
 *     summary: Report #2 — Plan vs Actual milestone comparison (Excel)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: budgetYear
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 500 }
 *     responses:
 *       200:
 *         description: Excel file download
 */
router.get('/plan-vs-actual', (req, res) =>
  reportsController.planVsActual(req, res),
);

/**
 * @openapi
 * /api/reports/delayed-procurement:
 *   get:
 *     summary: Report #4 — Delayed and overdue procurement stages (Excel)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *       - in: query
 *         name: budgetYear
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 500 }
 *     responses:
 *       200:
 *         description: Excel file download
 */
router.get('/delayed-procurement', (req, res) =>
  reportsController.delayedProcurement(req, res),
);

/**
 * @openapi
 * /api/reports/contract-payment:
 *   get:
 *     summary: Report #6 — Contract & Payment (Excel) — Director only
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: supplierId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 500 }
 *     responses:
 *       200:
 *         description: Excel file download
 *       403:
 *         description: Director access required
 */
router.get('/contract-payment', (req, res) =>
  reportsController.contractPayment(req, res),
);

/**
 * @openapi
 * /api/reports/monthly-summary:
 *   get:
 *     summary: Report #5 — Monthly Summary (Excel) — Director only
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: dateBasis
 *         schema: { type: string, enum: [awarded, planned, completed], default: awarded }
 *     responses:
 *       200:
 *         description: Excel file download
 *       403:
 *         description: Director access required
 */
router.get('/monthly-summary', (req, res) =>
  reportsController.monthlySummary(req, res),
);

/**
 * @openapi
 * /api/reports/project-officer-summary:
 *   get:
 *     summary: Report #8 — Project & Officer Summary (Excel) — Director only
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: budgetYear
 *         schema: { type: string }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 500 }
 *     responses:
 *       200:
 *         description: Excel file download
 *       403:
 *         description: Director access required
 */
router.get('/project-officer-summary', (req, res) =>
  reportsController.projectOfficerSummary(req, res),
);

export default router;
