import type { Response } from 'express';

// ─── Handlers (one file per domain group) ─────────────────────────────────────
import {
  streamAnnualProcurementPlan,
  streamPlanVsActual,
  streamCommitteeApprovalProgress,
} from './handlers/plan.report.js';

import {
  streamQuarterlyDetailedProcurement,
  streamProcurementSteps,
  streamDelayedProcurement,
  streamActivityMilestone,
} from './handlers/activity.report.js';

import {
  streamContractRegister,
  streamContractPayment,
  streamSupplierPerformance,
} from './handlers/contract.report.js';

import {
  streamMonthlyProcurementReport,
  streamQuarterlyProcurementSummary,
  streamRegionalSectorSummary,
  streamProjectSummary,
  streamOfficerSummary,
} from './handlers/analytics.report.js';

import type {
  AnnualPlanQuery,
  PlanVsActualQuery,
  ProcurementStepQuery,
  DelayedProcurementQuery,
  MonthlyProcurementQuery,
  MonthlySummaryQuery,
  QuarterlySummaryQuery,
  QuarterlyDetailedQuery,
  DetailedProcurementQuery,
  ContractRegisterQuery,
  ContractPaymentQuery,
  RegionalSectorSummaryQuery,
  ProjectSummaryQuery,
  OfficerSummaryQuery,
  ProjectOfficerSummaryQuery,
  CommitteeApprovalQuery,
  SupplierPerformanceQuery,
  ActivityMilestoneQuery,
} from './reports.schema.js';

// ─── Thin orchestrator — delegates to focused handler functions ────────────────
export class ReportsService {
  // Report #1 (P0)
  streamAnnualProcurementPlan(
    res: Response,
    query: AnnualPlanQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamAnnualProcurementPlan(res, query, userId, isDirector);
  }

  // Report #2 (P0)
  streamPlanVsActual(
    res: Response,
    query: PlanVsActualQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamPlanVsActual(res, query, userId, isDirector);
  }

  // Report #3 (P0)
  streamProcurementSteps(res: Response, query: ProcurementStepQuery) {
    return streamProcurementSteps(res, query);
  }

  // Report #4 (P0)
  streamDelayedProcurement(
    res: Response,
    query: DelayedProcurementQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamDelayedProcurement(res, query, userId, isDirector);
  }

  // Report #5 (P0)
  streamMonthlyProcurement(res: Response, query: MonthlyProcurementQuery) {
    return streamMonthlyProcurementReport(res, query);
  }
  streamMonthlySummary(res: Response, query: MonthlySummaryQuery) {
    return streamMonthlyProcurementReport(res, query);
  }

  // Report #6 (P0)
  streamQuarterlySummary(res: Response, query: QuarterlySummaryQuery) {
    return streamQuarterlyProcurementSummary(res, query);
  }

  // Report #7 (P1)
  streamQuarterlyDetailed(
    res: Response,
    query: QuarterlyDetailedQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamQuarterlyDetailedProcurement(res, query, userId, isDirector);
  }
  streamDetailedProcurement(
    res: Response,
    query: DetailedProcurementQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamQuarterlyDetailedProcurement(res, query, userId, isDirector);
  }

  // Report #8 (P0)
  streamContractRegister(res: Response, query: ContractRegisterQuery) {
    return streamContractRegister(res, query);
  }

  // Report #9 (P0)
  streamContractPayment(res: Response, query: ContractPaymentQuery) {
    return streamContractPayment(res, query);
  }

  // Report #10 (P0)
  streamRegionalSectorSummary(
    res: Response,
    query: RegionalSectorSummaryQuery,
  ) {
    return streamRegionalSectorSummary(res, query);
  }

  // Report #11 (P0)
  streamProjectSummary(res: Response, query: ProjectSummaryQuery) {
    return streamProjectSummary(res, query);
  }

  // Report #12 (P0)
  streamOfficerSummary(res: Response, query: OfficerSummaryQuery) {
    return streamOfficerSummary(res, query);
  }
  streamProjectOfficerSummary(
    res: Response,
    query: ProjectOfficerSummaryQuery,
  ) {
    return streamOfficerSummary(res, query);
  }

  // Report #13 (P0)
  streamCommitteeApprovalProgress(
    res: Response,
    query: CommitteeApprovalQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamCommitteeApprovalProgress(res, query, userId, isDirector);
  }

  // Report #14 (P1)
  streamSupplierPerformance(res: Response, query: SupplierPerformanceQuery) {
    return streamSupplierPerformance(res, query);
  }

  // Legacy
  streamActivityMilestone(
    res: Response,
    query: ActivityMilestoneQuery,
    userId: string,
    isDirector: boolean,
  ) {
    return streamActivityMilestone(res, query, userId, isDirector);
  }
}
