import type { Response } from 'express';

// ─── Handlers (one file per domain group) ─────────────────────────────────────
import {
  streamAnnualProcurementPlan,
  streamPlanVsActual,
} from './handlers/plan.report.js';

import {
  streamDetailedProcurement,
  streamProcurementSteps,
  streamDelayedProcurement,
  streamActivityMilestone,
} from './handlers/activity.report.js';

import { streamContractPayment } from './handlers/contract.report.js';

import {
  streamMonthlySummary,
  streamProjectOfficerSummary,
} from './handlers/analytics.report.js';

import type {
  AnnualPlanQuery,
  PlanVsActualQuery,
  DetailedProcurementQuery,
  ProcurementStepQuery,
  DelayedProcurementQuery,
  ContractPaymentQuery,
  MonthlySummaryQuery,
  ProjectOfficerSummaryQuery,
  ActivityMilestoneQuery,
} from './reports.schema.js';

// ─── Thin orchestrator — delegates to focused handler functions ────────────────
export class ReportsService {
  streamAnnualProcurementPlan(
    res: Response,
    query: AnnualPlanQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamAnnualProcurementPlan(res, query, userId, isDirector);
  }

  streamPlanVsActual(
    res: Response,
    query: PlanVsActualQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamPlanVsActual(res, query, userId, isDirector);
  }

  streamDetailedProcurement(
    res: Response,
    query: DetailedProcurementQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamDetailedProcurement(res, query, userId, isDirector);
  }

  streamProcurementSteps(res: Response, query: ProcurementStepQuery) {
    return streamProcurementSteps(res, query);
  }

  streamDelayedProcurement(
    res: Response,
    query: DelayedProcurementQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamDelayedProcurement(res, query, userId, isDirector);
  }

  streamContractPayment(res: Response, query: ContractPaymentQuery) {
    return streamContractPayment(res, query);
  }

  streamMonthlySummary(res: Response, query: MonthlySummaryQuery) {
    return streamMonthlySummary(res, query);
  }

  streamProjectOfficerSummary(
    res: Response,
    query: ProjectOfficerSummaryQuery,
  ) {
    return streamProjectOfficerSummary(res, query);
  }

  streamActivityMilestone(
    res: Response,
    query: ActivityMilestoneQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamActivityMilestone(res, query, userId, isDirector);
  }
}
