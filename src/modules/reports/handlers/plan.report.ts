import type { Response } from 'express';
import type {
  PlanStatus,
  StageStatus,
} from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/database.js';
import { excelService } from '../../excel/excel.service.js';
import type { AnnualPlanQuery, PlanVsActualQuery } from '../reports.schema.js';

const { createStreamingWorkbook, fmtDecimal, fmtDate } = excelService;

// ─── Report #1: Annual Procurement Plan ────────────────────────────────────────
export async function streamAnnualProcurementPlan(
  res: Response,
  query: AnnualPlanQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  const {
    budgetYear,
    projectId,
    planId,
    category,
    methodId,
    fundingSourceId,
    region,
    officerId,
    status,
    minAmount,
    maxAmount,
    page,
    limit,
  } = query;

  const where = {
    budgetYear,
    isActive: true,
    ...(isDirector ? {} : { createdBy: userId }),
    ...(projectId ? { projectId } : {}),
    ...(planId ? { id: planId } : {}),
    ...(category ? { procurementCategory: category } : {}),
    ...(status ? { status: status as PlanStatus } : {}),
    ...(officerId ? { createdBy: officerId } : {}),
    ...(fundingSourceId ? { project: { fundingSourceId } } : {}),
    ...(region
      ? { activities: { some: { contracts: { some: { region } } } } }
      : {}),
    ...(methodId
      ? { activities: { some: { procurementMethodId: methodId } } }
      : {}),
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
          fundingSource: { select: { label: true } },
        },
      },
      creator: { select: { displayName: true } },
      approvedByUser: { select: { displayName: true } },
      activities: {
        include: {
          procurementMethod: { select: { label: true } },
          stages: { orderBy: { sequence: 'asc' } },
          contracts: { select: { totalValue: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `annual_procurement_plan_${budgetYear}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const summarySheet = addSheet('Plan Summary', [
    'Plan Title',
    'Project Code',
    'Project Name',
    'Budget Year',
    'Category',
    '# Activities',
    'Total Estimated Budget',
    'Period Start',
    'Period End',
    'Status',
    'Approved By',
    'Approved Date',
    'Created By',
  ]);

  const detailSheet = addSheet('Activity Detail', [
    'Project',
    'Plan',
    'Activity Reference',
    'Activity Description',
    'Category',
    'Method',
    'Estimated Amount',
    'Currency',
    'Funding Source',
    'Officer',
    'Original Planned Dates',
    'Current Target Dates',
    'Status',
  ]);

  for (const plan of plans) {
    const totalBudget = plan.activities.reduce(
      (sum, a) => sum + Number(a.estimatedBudget),
      0,
    );

    summarySheet.addRow([
      plan.title,
      plan.project.code,
      plan.project.name,
      plan.budgetYear ?? '',
      plan.procurementCategory ?? '',
      plan.activities.length,
      totalBudget.toFixed(2),
      fmtDate(plan.periodStart),
      fmtDate(plan.periodEnd),
      plan.status,
      plan.approvedByUser?.displayName ?? '',
      fmtDate(plan.approvedAt),
      plan.creator.displayName,
    ]);

    for (const a of plan.activities) {
      const firstStage = a.stages[0];
      const lastStage = a.stages[a.stages.length - 1];

      const origDates =
        firstStage?.plannedStartDate && lastStage?.plannedEndDate
          ? `${fmtDate(firstStage.plannedStartDate)} to ${fmtDate(lastStage.plannedEndDate)}`
          : '';

      const targetDates =
        firstStage?.currentTargetStartDate && lastStage?.currentTargetEndDate
          ? `${fmtDate(firstStage.currentTargetStartDate)} to ${fmtDate(lastStage.currentTargetEndDate)}`
          : '';

      detailSheet.addRow([
        plan.project.name,
        plan.title,
        a.reference,
        a.description ?? '',
        plan.procurementCategory ?? '',
        a.procurementMethod.label,
        fmtDecimal(a.estimatedBudget),
        a.currency ?? '',
        plan.project.fundingSource.label,
        plan.creator.displayName,
        origDates,
        targetDates,
        a.status,
      ]);
    }
  }

  await (summarySheet as unknown as { commit: () => Promise<void> }).commit();
  await (detailSheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #2: Plan vs Actual ─────────────────────────────────────────────────
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
        },
      },
    },
  };

  const stages = await prisma.stage.findMany({
    where,
    include: {
      stageType: { select: { label: true } },
      revisions: { orderBy: { revisionNo: 'asc' } },
      activity: {
        select: {
          reference: true,
          description: true,
          plan: {
            select: {
              title: true,
              project: { select: { name: true } },
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
    'Project',
    'Activity',
    'Stage',
    'Original Planned Date',
    'Current Target Date',
    'Actual Date',
    'Variance / Delay Days',
    'Status',
    'Replanning Count',
    'Replanning Reason',
  ]);

  for (const s of paginated) {
    let delayDays = '';
    if (s.status === 'COMPLETED' && s.actualEndDate && s.currentTargetEndDate) {
      const diff = s.actualEndDate.getTime() - s.currentTargetEndDate.getTime();
      delayDays = String(Math.round(diff / 86_400_000));
    } else if (
      s.status !== 'COMPLETED' &&
      s.currentTargetEndDate &&
      s.currentTargetEndDate < today
    ) {
      const diff = today.getTime() - s.currentTargetEndDate.getTime();
      delayDays = String(Math.round(diff / 86_400_000));
    }

    const lastRev = s.revisions[s.revisions.length - 1];

    sheet.addRow([
      s.activity.plan.project.name,
      `${s.activity.reference} - ${s.activity.description ?? ''}`,
      s.stageType.label,
      fmtDate(s.plannedEndDate),
      fmtDate(s.currentTargetEndDate),
      fmtDate(s.actualEndDate),
      delayDays,
      s.status,
      s.revisions.length,
      lastRev?.reason ?? '',
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}
