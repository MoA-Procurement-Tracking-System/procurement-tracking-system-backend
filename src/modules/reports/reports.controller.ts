import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ReportsService } from './reports.service.js';
import {
  annualPlanSchema,
  planVsActualSchema,
  procurementStepSchema,
  delayedProcurementSchema,
  monthlyProcurementSchema,
  monthlySummarySchema,
  quarterlySummarySchema,
  quarterlyDetailedSchema,
  contractRegisterSchema,
  contractPaymentSchema,
  regionalSectorSummarySchema,
  projectSummarySchema,
  officerSummarySchema,
  committeeApprovalSchema,
  supplierPerformanceSchema,
  activityMilestoneSchema,
} from './reports.schema.js';
import type { UserRole } from '../../generated/prisma/index.js';

const service = new ReportsService();

function handleError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({ status: 'VALIDATION_ERROR', errors: error.issues });
    return;
  }
  const message =
    error instanceof Error ? error.message : 'Error generating report';
  res.status(500).json({ status: 'ERROR', message });
}

function isDirectorOrAdmin(role: UserRole): boolean {
  return role === 'DIRECTOR' || role === 'ADMIN';
}

async function getActiveUser(req: Request) {
  if (req.auth?.user) {
    return {
      id: req.auth.user.id,
      authRole: req.auth.user.role as UserRole,
    };
  }
  throw new Error('Sign in is required.');
}

export class ReportsController {
  // Report #1 (P0) — Annual Procurement Plan
  async annualProcurementPlan(req: Request, res: Response): Promise<void> {
    try {
      const query = annualPlanSchema.parse(req.query);
      const user = await getActiveUser(req);
      await service.streamAnnualProcurementPlan(
        res,
        query,
        user.id,
        isDirectorOrAdmin(user.authRole),
      );
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #2 (P0) — Plan vs Actual Progress
  async planVsActual(req: Request, res: Response): Promise<void> {
    try {
      const query = planVsActualSchema.parse(req.query);
      const user = await getActiveUser(req);
      await service.streamPlanVsActual(
        res,
        query,
        user.id,
        isDirectorOrAdmin(user.authRole),
      );
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #3 (P0) — Procurement Step Report
  async procurementSteps(req: Request, res: Response): Promise<void> {
    try {
      const query = procurementStepSchema.parse(req.query);
      await service.streamProcurementSteps(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #4 (P0) — Delayed Procurement Report
  async delayedProcurement(req: Request, res: Response): Promise<void> {
    try {
      const query = delayedProcurementSchema.parse(req.query);
      const user = await getActiveUser(req);
      await service.streamDelayedProcurement(
        res,
        query,
        user.id,
        isDirectorOrAdmin(user.authRole),
      );
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #5 (P0) — Monthly Procurement Report
  async monthlyProcurement(req: Request, res: Response): Promise<void> {
    try {
      const query = monthlyProcurementSchema.parse(req.query);
      await service.streamMonthlyProcurement(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }
  // Legacy alias
  async monthlySummary(req: Request, res: Response): Promise<void> {
    try {
      const query = monthlySummarySchema.parse(req.query);
      await service.streamMonthlySummary(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #6 (P0) — Quarterly Procurement Summary
  async quarterlySummary(req: Request, res: Response): Promise<void> {
    try {
      const query = quarterlySummarySchema.parse(req.query);
      await service.streamQuarterlySummary(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #7 (P1) — Quarterly Detailed Procurement Report
  async quarterlyDetailed(req: Request, res: Response): Promise<void> {
    try {
      const query = quarterlyDetailedSchema.parse(req.query);
      const user = await getActiveUser(req);
      await service.streamQuarterlyDetailed(
        res,
        query,
        user.id,
        isDirectorOrAdmin(user.authRole),
      );
    } catch (e) {
      handleError(res, e);
    }
  }
  // Legacy alias
  async detailedProcurement(req: Request, res: Response): Promise<void> {
    try {
      const query = quarterlyDetailedSchema.parse(req.query);
      const user = await getActiveUser(req);
      await service.streamDetailedProcurement(
        res,
        query,
        user.id,
        isDirectorOrAdmin(user.authRole),
      );
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #8 (P0) — Contract Register
  async contractRegister(req: Request, res: Response): Promise<void> {
    try {
      const query = contractRegisterSchema.parse(req.query);
      await service.streamContractRegister(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #9 (P0) — Contract & Payment Status Report
  async contractPayment(req: Request, res: Response): Promise<void> {
    try {
      const query = contractPaymentSchema.parse(req.query);
      await service.streamContractPayment(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #10 (P0) — Regional / Sector Summary
  async regionalSectorSummary(req: Request, res: Response): Promise<void> {
    try {
      const query = regionalSectorSummarySchema.parse(req.query);
      await service.streamRegionalSectorSummary(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #11 (P0) — Project Summary
  async projectSummary(req: Request, res: Response): Promise<void> {
    try {
      const query = projectSummarySchema.parse(req.query);
      await service.streamProjectSummary(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #12 (P0) — Officer Summary
  async officerSummary(req: Request, res: Response): Promise<void> {
    try {
      const query = officerSummarySchema.parse(req.query);
      await service.streamOfficerSummary(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }
  // Legacy alias
  async projectOfficerSummary(req: Request, res: Response): Promise<void> {
    try {
      const query = officerSummarySchema.parse(req.query);
      await service.streamProjectOfficerSummary(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #13 (P0) — Committee / Approval Progress Report
  async committeeApproval(req: Request, res: Response): Promise<void> {
    try {
      const query = committeeApprovalSchema.parse(req.query);
      const user = await getActiveUser(req);
      await service.streamCommitteeApprovalProgress(
        res,
        query,
        user.id,
        isDirectorOrAdmin(user.authRole),
      );
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #14 (P1) — Supplier Performance
  async supplierPerformance(req: Request, res: Response): Promise<void> {
    try {
      const query = supplierPerformanceSchema.parse(req.query);
      await service.streamSupplierPerformance(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Legacy Activity Milestone
  async activityMilestone(req: Request, res: Response): Promise<void> {
    try {
      const query = activityMilestoneSchema.parse(req.query);
      const user = await getActiveUser(req);
      await service.streamActivityMilestone(
        res,
        query,
        user.id,
        isDirectorOrAdmin(user.authRole),
      );
    } catch (e) {
      handleError(res, e);
    }
  }
}

export const reportsController = new ReportsController();
