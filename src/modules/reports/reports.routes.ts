import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { reportsController } from './reports.controller.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';
import { excelController } from '../excel/excel.controller.js';

const router = Router();
const upload = multer({ dest: os.tmpdir() });

// Secure all report endpoints using the project's cookie session middlewares
router.use(loadSession, requireAuthenticated);

// ─── 1. Annual Procurement Plan (P0) ──────────────────────────────────────────
router.get('/annual-procurement-plan', (req, res) =>
  reportsController.annualProcurementPlan(req, res),
);

// ─── 2. Plan vs Actual Progress (P0) ──────────────────────────────────────────
router.get('/plan-vs-actual', (req, res) =>
  reportsController.planVsActual(req, res),
);

// ─── 3. Procurement Step Report (P0) ──────────────────────────────────────────
router.get('/procurement-steps', (req, res) =>
  reportsController.procurementSteps(req, res),
);

// ─── 4. Delayed Procurement Report (P0) ───────────────────────────────────────
router.get('/delayed-procurement', (req, res) =>
  reportsController.delayedProcurement(req, res),
);

// ─── 5. Monthly Procurement Report (P0) ───────────────────────────────────────
router.get('/monthly-procurement', (req, res) =>
  reportsController.monthlyProcurement(req, res),
);
router.get('/monthly-summary', (req, res) =>
  reportsController.monthlyProcurement(req, res),
);

// ─── 6. Quarterly Procurement Summary (P0) ────────────────────────────────────
router.get('/quarterly-summary', (req, res) =>
  reportsController.quarterlySummary(req, res),
);

// ─── 7. Quarterly Detailed Procurement Report (P1) ────────────────────────────
router.get('/quarterly-detailed', (req, res) =>
  reportsController.quarterlyDetailed(req, res),
);
router.get('/detailed-procurement', (req, res) =>
  reportsController.detailedProcurement(req, res),
);

// ─── 8. Contract Register (P0) ────────────────────────────────────────────────
router.get('/contract-register', (req, res) =>
  reportsController.contractRegister(req, res),
);

// ─── 9. Contract & Payment Status Report (P0) ─────────────────────────────────
router.get('/contract-payment', (req, res) =>
  reportsController.contractPayment(req, res),
);

// ─── 10. Regional / Sector Summary (P0) ───────────────────────────────────────
router.get('/regional-sector-summary', (req, res) =>
  reportsController.regionalSectorSummary(req, res),
);

// ─── 11. Project Summary (P0) ─────────────────────────────────────────────────
router.get('/project-summary', (req, res) =>
  reportsController.projectSummary(req, res),
);

// ─── 12. Officer Summary (P0) ─────────────────────────────────────────────────
router.get('/officer-summary', (req, res) =>
  reportsController.officerSummary(req, res),
);
router.get('/project-officer-summary', (req, res) =>
  reportsController.officerSummary(req, res),
);

// ─── 13. Committee / Approval Progress Report (P0) ────────────────────────────
router.get('/committee-approval', (req, res) =>
  reportsController.committeeApproval(req, res),
);

// ─── 14. Supplier Performance (P1) ────────────────────────────────────────────
router.get('/supplier-performance', (req, res) =>
  reportsController.supplierPerformance(req, res),
);

// Legacy Activity Milestone Report
router.get('/activity-milestone', (req, res) =>
  reportsController.activityMilestone(req, res),
);

// ─── Import Endpoints ─────────────────────────────────────────────────────────
router.post('/import/contracts', upload.any(), (req, res) =>
  excelController.importContracts(req, res),
);
router.post('/import-contracts', upload.any(), (req, res) =>
  excelController.importContracts(req, res),
);
router.post('/import-report', upload.any(), (req, res) =>
  excelController.importContracts(req, res),
);

export default router;
