import type { Response } from 'express';
import type {
  PlanStatus,
  StageStatus,
} from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/database.js';
import { excelService } from '../../excel/excel.service.js';
import type {
  AnnualPlanQuery,
  PlanVsActualQuery,
  CommitteeApprovalQuery,
} from '../reports.schema.js';

const { createStreamingWorkbook, fmtDecimal, fmtDate } = excelService;

// ─── Report #1: Annual Procurement Plan (P0) ──────────────────────────────────
export async function streamAnnualProcurementPlan(
  res: Response,
  query: AnnualPlanQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  const {
    budgetYear,
    fiscalYear,
    projectId,
    planId,
    category,
    methodId,
    fundingSourceId,
    fundingType,
    region,
    sector,
    officerId,
    status,
    currency,
    minAmount,
    maxAmount,
    page,
    limit,
  } = query;

  const targetYear = budgetYear || fiscalYear;

  const where = {
    isActive: true,
    ...(targetYear ? { budgetYear: targetYear } : {}),
    ...(isDirector ? {} : { createdBy: userId }),
    ...(projectId ? { projectId } : {}),
    ...(planId ? { id: planId } : {}),
    ...(category ? { procurementCategory: category } : {}),
    ...(status ? { status: status as PlanStatus } : {}),
    ...(officerId ? { createdBy: officerId } : {}),
    ...(fundingSourceId ? { project: { fundingSourceId } } : {}),
    ...(fundingType ? { project: { fundingType } } : {}),
    ...(sector ? { project: { sector: { label: sector } } } : {}),
    ...(region
      ? { activities: { some: { contracts: { some: { region } } } } }
      : {}),
    ...(methodId
      ? { activities: { some: { procurementMethodId: methodId } } }
      : {}),
    ...(currency ? { activities: { some: { currency } } } : {}),
    ...(minAmount || maxAmount
      ? {
          activities: {
            some: {
              estimatedBudget: {
                ...(minAmount !== undefined ? { gte: minAmount } : {}),
                ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
              },
            },
          },
        }
      : {}),
  };

  const plans = await prisma.plan.findMany({
    where,
    include: {
      project: {
        select: {
          code: true,
          name: true,
          fundingType: true,
          fundingSource: { select: { label: true } },
          sector: { select: { label: true } },
        },
      },
      creator: { select: { displayName: true } },
      approvedByUser: { select: { displayName: true } },
      activities: {
        where: {
          isActive: true,
          ...(methodId ? { procurementMethodId: methodId } : {}),
          ...(currency ? { currency } : {}),
        },
        include: {
          creator: { select: { displayName: true } },
          procurementMethod: { select: { label: true } },
          stages: { orderBy: { sequence: 'asc' } },
          fundings: { select: { fundingSource: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `annual_procurement_plan_${targetYear ?? 'all'}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const detailSheet = addSheet('Annual Plan Activities', [
    'Project',
    'Plan',
    'Activity Reference',
    'Activity Description',
    'Category',
    'Procurement Method',
    'Financing Source',
    'Estimated Amount',
    'Currency',
    'Responsible Officer',
    'Planned Start Date',
    'Planned Completion Date',
    'Current Status',
  ]);

  const currencyTotals = new Map<string, number>();

  for (const plan of plans) {
    for (const a of plan.activities) {
      const firstStage = a.stages[0];
      const lastStage = a.stages[a.stages.length - 1];

      const plannedStart = firstStage?.plannedStartDate
        ? fmtDate(firstStage.plannedStartDate)
        : '';
      const plannedEnd = lastStage?.plannedEndDate
        ? fmtDate(lastStage.plannedEndDate)
        : '';

      const fundingLabel =
        a.fundings.length > 0
          ? a.fundings.map((f) => f.fundingSource).join(', ')
          : plan.project.fundingSource.label;

      const actCurrency = a.currency || 'ETB';
      const curSum = currencyTotals.get(actCurrency) || 0;
      currencyTotals.set(
        curSum !== undefined ? actCurrency : 'ETB',
        curSum + Number(a.estimatedBudget),
      );

      detailSheet.addRow([
        `${plan.project.code} - ${plan.project.name}`,
        plan.title,
        a.reference,
        a.description ?? '',
        plan.procurementCategory ?? '',
        a.procurementMethod.label,
        fundingLabel,
        fmtDecimal(a.estimatedBudget),
        actCurrency,
        a.creator?.displayName ?? plan.creator.displayName,
        plannedStart,
        plannedEnd,
        a.status,
      ]);
    }
  }

  // Totals sheet grouped strictly by currency (no mixed-currency total)
  const totalsSheet = addSheet('Budget Totals by Currency', [
    'Currency',
    'Total Estimated Budget',
  ]);
  for (const [cur, total] of currencyTotals.entries()) {
    totalsSheet.addRow([cur, total.toFixed(2)]);
  }

  await (detailSheet as unknown as { commit: () => Promise<void> }).commit();
  await (totalsSheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #2: Plan vs Actual Progress (P0) ──────────────────────────────────
export async function streamPlanVsActual(
  res: Response,
  query: PlanVsActualQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  const {
    projectId,
    planId,
    budgetYear,
    category,
    methodId,
    officerId,
    region,
    sector,
    fundingSourceId,
    stageTypeId,
    stageStatus,
    performanceStatus,
    dateFrom,
    dateTo,
    page,
    limit,
  } = query;

  const today = new Date();

  const where = {
    isNotApplicable: false,
    ...(stageTypeId ? { stageTypeId } : {}),
    ...(stageStatus ? { status: stageStatus as StageStatus } : {}),
    ...(dateFrom || dateTo
      ? {
          actualEndDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    activity: {
      ...(methodId ? { procurementMethodId: methodId } : {}),
      ...(region ? { contracts: { some: { region } } } : {}),
      plan: {
        ...(isDirector ? {} : { createdBy: userId }),
        ...(planId ? { id: planId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(budgetYear ? { budgetYear } : {}),
        ...(category ? { procurementCategory: category } : {}),
        ...(officerId ? { createdBy: officerId } : {}),
        project: {
          ...(fundingSourceId ? { fundingSourceId } : {}),
          ...(sector ? { sector: { label: sector } } : {}),
        },
      },
    },
  };

  const stages = await prisma.stage.findMany({
    where,
    include: {
      stageType: { select: { label: true } },
      revisions: { orderBy: { revisionNo: 'desc' }, take: 1 },
      activity: {
        select: {
          reference: true,
          description: true,
          procurementMethod: { select: { label: true } },
          creator: { select: { displayName: true } },
          plan: {
            select: {
              title: true,
              procurementCategory: true,
              project: { select: { code: true, name: true } },
              creator: { select: { displayName: true } },
            },
          },
        },
      },
    },
    orderBy: [{ activityId: 'asc' }, { sequence: 'asc' }],
  });

  let filteredStages = stages;
  if (performanceStatus) {
    filteredStages = stages.filter((s) => {
      const isLate =
        s.status === 'COMPLETED'
          ? s.actualEndDate &&
            s.currentTargetEndDate &&
            s.actualEndDate > s.currentTargetEndDate
          : s.currentTargetEndDate && s.currentTargetEndDate < today;
      return performanceStatus === 'DELAYED' ? isLate : !isLate;
    });
  }

  const paginated = filteredStages.slice((page - 1) * limit, page * limit);

  const filename = `plan_vs_actual_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Plan vs Actual', [
    'Activity Reference',
    'Activity Description',
    'Project',
    'Officer',
    'Category',
    'Method',
    'Stage',
    'Baseline / Original Date',
    'Revised / Current Date',
    'Actual Date',
    'Variance Days',
    'Delay Days',
    'Stage Status',
    'Remarks',
  ]);

  for (const s of paginated) {
    // Variance: actual/current target vs original baseline
    let varianceDays = '';
    if (s.plannedEndDate) {
      const compareDate = s.actualEndDate || s.currentTargetEndDate;
      if (compareDate) {
        const diff = compareDate.getTime() - s.plannedEndDate.getTime();
        varianceDays = String(Math.round(diff / 86_400_000));
      }
    }

    // Delay: overdue days past effective current target
    let delayDays = '';
    if (s.status === 'COMPLETED' && s.actualEndDate && s.currentTargetEndDate) {
      if (s.actualEndDate > s.currentTargetEndDate) {
        const diff =
          s.actualEndDate.getTime() - s.currentTargetEndDate.getTime();
        delayDays = String(Math.round(diff / 86_400_000));
      }
    } else if (
      s.status !== 'COMPLETED' &&
      s.currentTargetEndDate &&
      s.currentTargetEndDate < today
    ) {
      const diff = today.getTime() - s.currentTargetEndDate.getTime();
      delayDays = String(Math.round(diff / 86_400_000));
    }

    const latestRevision = s.revisions[0];
    const remarks = s.remarks || latestRevision?.reason || '';

    sheet.addRow([
      s.activity.reference,
      s.activity.description ?? '',
      `${s.activity.plan.project.code} - ${s.activity.plan.project.name}`,
      s.activity.creator?.displayName || s.activity.plan.creator.displayName,
      s.activity.plan.procurementCategory ?? '',
      s.activity.procurementMethod.label,
      s.stageType.label,
      fmtDate(s.plannedEndDate),
      s.currentTargetEndDate &&
      s.plannedEndDate?.getTime() !== s.currentTargetEndDate.getTime()
        ? fmtDate(s.currentTargetEndDate)
        : '',
      fmtDate(s.actualEndDate),
      varianceDays,
      delayDays,
      s.status,
      remarks,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #13: Committee / Approval Progress Report (P0) ────────────────────
export async function streamCommitteeApprovalProgress(
  res: Response,
  query: CommitteeApprovalQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  const {
    fiscalYear,
    budgetYear,
    projectId,
    officerId,
    planStatus,
    directorDecision,
    committeeResult,
    managementDecision,
    page,
    limit,
  } = query;

  const targetYear = budgetYear || fiscalYear;

  const where = {
    isActive: true,
    ...(targetYear ? { budgetYear: targetYear } : {}),
    ...(isDirector ? {} : { createdBy: userId }),
    ...(projectId ? { projectId } : {}),
    ...(officerId ? { createdBy: officerId } : {}),
    ...(planStatus ? { status: planStatus as PlanStatus } : {}),
    ...(managementDecision ? { managementDecision } : {}),
  };

  const plans = await prisma.plan.findMany({
    where,
    include: {
      project: { select: { code: true, name: true } },
      creator: { select: { displayName: true } },
      committeeVotes: {
        orderBy: { createdAt: 'desc' },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `committee_approval_progress_${targetYear ?? 'all'}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Approval Workflow Progress', [
    'Plan',
    'Project',
    'Officer',
    'Submitted Date',
    'Director Decision',
    'Director Comment',
    'Committee Approvals',
    'Committee Rejections',
    'Pending Votes',
    'Committee Result',
    'Management Decision',
    'Management Comment',
    'Current Plan Status',
  ]);

  for (const plan of plans) {
    // 1. Submitted Date from status history (when moved from DRAFT to SUBMITTED)
    const submittedEntry = plan.statusHistory.find(
      (h) => h.toStatus === 'SUBMITTED',
    );
    const submittedDate = submittedEntry
      ? fmtDate(submittedEntry.createdAt)
      : fmtDate(plan.createdAt);

    // 2. Director Review Decision & Comments
    let dirDecision = 'PENDING';
    if (plan.status !== 'DRAFT' && plan.status !== 'SUBMITTED') {
      if (plan.status === 'RETURNED_FOR_REVISION') {
        dirDecision = 'RETURNED_FOR_REVISION';
      } else if (plan.status === 'REJECTED') {
        dirDecision = 'REJECTED';
      } else {
        dirDecision = 'FORWARDED_TO_COMMITTEE';
      }
    }
    const dirComment =
      plan.directorRevisionComment ||
      plan.rejectionReason ||
      plan.reviews[0]?.notes ||
      '';

    if (directorDecision && dirDecision !== directorDecision) {
      continue;
    }

    // 3. Committee Votes for the current committee round
    const currentRound = plan.committeeRound || 1;
    const currentRoundVotes = plan.committeeVotes.filter(
      (v) => v.round === currentRound,
    );
    const approvals = currentRoundVotes.filter(
      (v) => v.decision === 'APPROVE',
    ).length;
    const rejections = currentRoundVotes.filter(
      (v) => v.decision === 'REJECT',
    ).length;
    const pendingVotes = Math.max(0, 5 - (approvals + rejections));

    let comResult = 'PENDING';
    if (approvals >= 3) {
      comResult = 'ENDORSED';
    } else if (rejections >= 3) {
      comResult = 'REJECTED';
    } else if (currentRoundVotes.length > 0) {
      comResult = 'IN_VOTING';
    }

    if (committeeResult && comResult !== committeeResult) {
      continue;
    }

    // 4. Management Decision & Comments
    const mgmtDecision = plan.managementDecision || 'PENDING';
    const mgmtComment = plan.managementComment || '';

    sheet.addRow([
      plan.title,
      `${plan.project.code} - ${plan.project.name}`,
      plan.creator.displayName,
      submittedDate,
      dirDecision,
      dirComment,
      approvals,
      rejections,
      pendingVotes,
      comResult,
      mgmtDecision,
      mgmtComment,
      plan.status,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}
