import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ReportsService } from './reports.service.js';
import {
  detailedProcurementSchema,
  annualPlanSchema,
  procurementStepSchema,
  planVsActualSchema,
  delayedProcurementSchema,
  contractPaymentSchema,
  monthlySummarySchema,
  projectOfficerSummarySchema,
} from './reports.schema.js';
import type { UserRole } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';

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
  // Development fallback: look up the seeded admin user
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@moa.gov.et' },
  });
  return {
    id: admin?.id || 'test-user-id',
    authRole: (admin?.authRole || 'ADMIN') as UserRole,
  };
}

export class ReportsController {
  // Report #7
  async detailedProcurement(req: Request, res: Response): Promise<void> {
    try {
      const query = detailedProcurementSchema.parse(req.query);
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

  // Report #1
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

  // Report #3
  async procurementSteps(req: Request, res: Response): Promise<void> {
    try {
      const query = procurementStepSchema.parse(req.query);
      await service.streamProcurementSteps(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #2
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

  // Report #4
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

  // Report #6 — Director only
  async contractPayment(req: Request, res: Response): Promise<void> {
    try {
      const user = await getActiveUser(req);
      if (!isDirectorOrAdmin(user.authRole)) {
        res
          .status(403)
          .json({ status: 'FORBIDDEN', message: 'Director access required' });
        return;
      }
      const query = contractPaymentSchema.parse(req.query);
      await service.streamContractPayment(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #5 — Director only
  async monthlySummary(req: Request, res: Response): Promise<void> {
    try {
      const user = await getActiveUser(req);
      if (!isDirectorOrAdmin(user.authRole)) {
        res
          .status(403)
          .json({ status: 'FORBIDDEN', message: 'Director access required' });
        return;
      }
      const query = monthlySummarySchema.parse(req.query);
      await service.streamMonthlySummary(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }

  // Report #8 — Director only
  async projectOfficerSummary(req: Request, res: Response): Promise<void> {
    try {
      const user = await getActiveUser(req);
      if (!isDirectorOrAdmin(user.authRole)) {
        res
          .status(403)
          .json({ status: 'FORBIDDEN', message: 'Director access required' });
        return;
      }
      const query = projectOfficerSummarySchema.parse(req.query);
      await service.streamProjectOfficerSummary(res, query);
    } catch (e) {
      handleError(res, e);
    }
  }
}

export const reportsController = new ReportsController();
