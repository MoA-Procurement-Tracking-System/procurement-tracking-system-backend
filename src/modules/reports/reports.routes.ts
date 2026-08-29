import { Router } from 'express';
import { reportsController } from './reports.controller.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';

const router = Router();

// Secure all report endpoints using the project's cookie session middlewares
router.use(loadSession, requireAuthenticated);

/**
 * @openapi
 * /api/reports/detailed-procurement:
 *   get:
 *     summary: Report #7 — Detailed Procurement (Excel)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *       - in: query
 *         name: activityId
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: methodId
 *         schema: { type: string }
 *       - in: query
 *         name: marketApproach
 *         schema: { type: string }
 *       - in: query
 *         name: reviewType
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
 *         schema: { type: string }
 *       - in: query
 *         name: supplierId
 *         schema: { type: string }
 *       - in: query
 *         name: contractStatus
 *         schema: { type: string }
 *       - in: query
 *         name: activityStatus
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
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
router.get('/detailed-procurement', (req, res) =>
  reportsController.detailedProcurement(req, res),
);

/**
 * @openapi
 * /api/reports/annual-procurement-plan:
 *   get:
 *     summary: Report #1 — Annual Procurement Plan (Excel)
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
 *         name: planId
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: methodId
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: minAmount
 *         schema: { type: number }
 *       - in: query
 *         name: maxAmount
 *         schema: { type: number }
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
 *     summary: Report #3 — Procurement STEP Report (Excel)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: methodId
 *         schema: { type: string }
 *       - in: query
 *         name: marketApproach
 *         schema: { type: string }
 *       - in: query
 *         name: reviewType
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
 *         schema: { type: string }
 *       - in: query
 *         name: activityStatus
 *         schema: { type: string }
 *       - in: query
 *         name: stageTypeId
 *         schema: { type: string }
 *       - in: query
 *         name: stageStatus
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
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
router.get('/procurement-steps', (req, res) =>
  reportsController.procurementSteps(req, res),
);

/**
 * @openapi
 * /api/reports/plan-vs-actual:
 *   get:
 *     summary: Report #2 — Plan vs Actual comparison (Excel)
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
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: methodId
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: stageTypeId
 *         schema: { type: string }
 *       - in: query
 *         name: stageStatus
 *         schema: { type: string }
 *       - in: query
 *         name: performanceStatus
 *         schema: { type: string, enum: [ON_TIME, DELAYED] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
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
 *     summary: Report #4 — Delayed Procurement (Excel)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: methodId
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: activityStatus
 *         schema: { type: string }
 *       - in: query
 *         name: stageTypeId
 *         schema: { type: string }
 *       - in: query
 *         name: minDelayDays
 *         schema: { type: integer }
 *       - in: query
 *         name: delayBucket
 *         schema: { type: string, enum: [1-7, 8-30, 31-60, 60+] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
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
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: planId
 *         schema: { type: string }
 *       - in: query
 *         name: activityId
 *         schema: { type: string }
 *       - in: query
 *         name: supplierId
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
 *         schema: { type: string }
 *       - in: query
 *         name: contractStatus
 *         schema: { type: string }
 *       - in: query
 *         name: paymentStatus
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: minAmount
 *         schema: { type: number }
 *       - in: query
 *         name: maxAmount
 *         schema: { type: number }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
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
 *         name: quarter
 *         schema: { type: integer, enum: [1, 2, 3, 4] }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: methodId
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
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
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: budgetYear
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: methodId
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: status
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

/**
 * @openapi
 * /api/reports/activity-milestone:
 *   get:
 *     summary: Report #9 — Activity Milestone Report (Excel)
 *     description: >
 *       One row per Activity. Fixed identity columns followed by dynamic
 *       Planned/Actual date column pairs for each procurement stage milestone
 *       found in the result set (ordered by stage sequence). Matches the
 *       "Direct Selection" tracker format.
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
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: methodId
 *         schema: { type: string }
 *       - in: query
 *         name: marketApproach
 *         schema: { type: string }
 *       - in: query
 *         name: reviewType
 *         schema: { type: string }
 *       - in: query
 *         name: fundingSourceId
 *         schema: { type: string }
 *       - in: query
 *         name: officerId
 *         schema: { type: string }
 *       - in: query
 *         name: activityStatus
 *         schema: { type: string }
 *       - in: query
 *         name: contractStatus
 *         schema: { type: string }
 *       - in: query
 *         name: supplierId
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 500 }
 *     responses:
 *       200:
 *         description: Excel file download (.xlsx)
 */
router.get('/activity-milestone', (req, res) =>
  reportsController.activityMilestone(req, res),
);

export default router;
