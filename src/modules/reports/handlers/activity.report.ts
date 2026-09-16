import type { Response } from 'express';
import type {
  ActivityStatus,
  ContractStatus,
  StageStatus,
} from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/database.js';
import { excelService } from '../../excel/excel.service.js';
import type {
  ProcurementStepQuery,
  DelayedProcurementQuery,
  QuarterlyDetailedQuery,
  ActivityMilestoneQuery,
} from '../reports.schema.js';

const { createStreamingWorkbook, fmtDecimal, fmtDate } = excelService;

// ─── Report #3: Procurement Step Report (P0) ──────────────────────────────────
export async function streamProcurementSteps(
  res: Response,
  query: ProcurementStepQuery,
): Promise<void> {
  const {
    projectId,
    planId,
    category,
    methodId,
    marketApproach,
    reviewType,
    fundingSourceId,
    officerId,
    activityStatus,
    status,
    stageTypeId,
    stageStatus,
    currency,
    dateFrom,
    dateTo,
    page,
    limit,
  } = query;

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
      ...(activityStatus || status
        ? { status: (activityStatus || status) as ActivityStatus }
        : {}),
      ...(methodId ? { procurementMethodId: methodId } : {}),
      ...(marketApproach ? { marketApproach } : {}),
      ...(reviewType ? { reviewType } : {}),
      ...(currency ? { currency } : {}),
      plan: {
        ...(planId ? { id: planId } : {}),
        ...(projectId ? { projectId } : {}),
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
      activity: {
        include: {
          procurementMethod: { select: { label: true } },
          plan: {
            select: {
              title: true,
              procurementCategory: true,
              project: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ activityId: 'asc' }, { sequence: 'asc' }],
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `procurement_step_report_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Procurement Step Roadmap', [
    'Activity Reference',
    'Activity Description',
    'Project',
    'Category',
    'Procurement Method',
    'Review Type',
    'Market Approach',
    'Estimated Amount',
    'Stage',
    'Planned Date',
    'Revised Date',
    'Actual Date',
    'Stage Status',
    'Delay Days',
  ]);

  const today = new Date();

  for (const s of stages) {
    let delayDays = '';
    if (s.status === 'COMPLETED' && s.actualEndDate && s.currentTargetEndDate) {
      if (s.actualEndDate > s.currentTargetEndDate) {
        const diff = s.actualEndDate.getTime() - s.currentTargetEndDate.getTime();
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

    const revisedDate =
      s.currentTargetEndDate &&
      s.plannedEndDate?.getTime() !== s.currentTargetEndDate.getTime()
        ? fmtDate(s.currentTargetEndDate)
        : '';

    const currencyStr = s.activity.currency || 'ETB';

    sheet.addRow([
      s.activity.reference,
      s.activity.description ?? '',
      `${s.activity.plan.project.code} - ${s.activity.plan.project.name}`,
      s.activity.plan.procurementCategory ?? '',
      s.activity.procurementMethod.label,
      s.activity.reviewType ?? '',
      s.activity.marketApproach ?? '',
      `${currencyStr} ${fmtDecimal(s.activity.estimatedBudget)}`,
      s.stageType.label,
      fmtDate(s.plannedEndDate),
      revisedDate,
      fmtDate(s.actualEndDate),
      s.status,
      delayDays,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #4: Delayed Procurement Report (P0) ───────────────────────────────
export async function streamDelayedProcurement(
  res: Response,
  query: DelayedProcurementQuery,
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
    officerId,
    region,
    sector,
    fundingSourceId,
    activityStatus,
    status,
    stageTypeId,
    minDelayDays,
    delayBucket,
    dateFrom,
    dateTo,
    page,
    limit,
  } = query;

  const today = new Date();
  const targetYear = budgetYear || fiscalYear;

  const planFilter = {
    ...(isDirector ? {} : { createdBy: userId }),
    ...(targetYear ? { budgetYear: targetYear } : {}),
    ...(planId ? { id: planId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(category ? { procurementCategory: category } : {}),
    ...(officerId ? { createdBy: officerId } : {}),
    project: {
      ...(fundingSourceId ? { fundingSourceId } : {}),
      ...(sector ? { sector: { label: sector } } : {}),
    },
  };

  const stageWhere = {
    isNotApplicable: false,
    ...(stageTypeId ? { stageTypeId } : {}),
    ...(dateFrom || dateTo
      ? {
          actualEndDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    activity: {
      ...(activityStatus || status
        ? { status: (activityStatus || status) as ActivityStatus }
        : {}),
      ...(methodId ? { procurementMethodId: methodId } : {}),
      ...(region ? { contracts: { some: { region } } } : {}),
      plan: planFilter,
    },
  };

  const stages = await prisma.stage.findMany({
    where: {
      ...stageWhere,
      OR: [
        {
          status: { notIn: ['COMPLETED'] },
          currentTargetEndDate: { lt: today },
        },
        {
          status: 'COMPLETED',
          actualEndDate: { gt: prisma.stage.fields.currentTargetEndDate },
        },
      ],
    },
    include: {
      stageType: { select: { label: true } },
      revisions: { orderBy: { revisionNo: 'desc' }, take: 1 },
      activity: {
        include: {
          procurementMethod: { select: { label: true } },
          fundings: { select: { fundingSource: true } },
          plan: {
            include: {
              project: { select: { code: true, name: true, fundingSource: { select: { label: true } } } },
              creator: { select: { displayName: true } },
            },
          },
        },
      },
    },
  });

  const computed = stages
    .map((s) => {
      let delayDays = 0;
      if (
        s.status === 'COMPLETED' &&
        s.actualEndDate &&
        s.currentTargetEndDate
      ) {
        delayDays = Math.round(
          (s.actualEndDate.getTime() - s.currentTargetEndDate.getTime()) /
            86_400_000,
        );
      } else if (s.currentTargetEndDate) {
        delayDays = Math.round(
          (today.getTime() - s.currentTargetEndDate.getTime()) / 86_400_000,
        );
      }
      return { stage: s, delayDays };
    })
    .filter(({ delayDays }) => {
      if (delayDays <= 0) return false;
      if (minDelayDays !== undefined && delayDays < minDelayDays) return false;
      if (delayBucket) {
        if (delayBucket === '1-7') return delayDays >= 1 && delayDays <= 7;
        if (delayBucket === '8-30') return delayDays >= 8 && delayDays <= 30;
        if (delayBucket === '31-60') return delayDays >= 31 && delayDays <= 60;
        if (delayBucket === '60+') return delayDays >= 60;
      }
      return true;
    })
    // Sort descending by delay days as required
    .sort((a, b) => b.delayDays - a.delayDays);

  const paginated = computed.slice((page - 1) * limit, page * limit);

  const filename = `delayed_procurement_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Delayed Procurement', [
    'Activity Reference',
    'Activity Description',
    'Project',
    'Category',
    'Method',
    'Responsible Officer',
    'Delayed Stage',
    'Effective Target Date',
    'Delay Days',
    'Funding Source',
    'Status',
    'Remarks',
  ]);

  for (const { stage: s, delayDays } of paginated) {
    const lastRev = s.revisions[0];
    const funding =
      s.activity.fundings.length > 0
        ? s.activity.fundings.map((f) => f.fundingSource).join(', ')
        : s.activity.plan.project.fundingSource.label;

    sheet.addRow([
      s.activity.reference,
      s.activity.description ?? '',
      `${s.activity.plan.project.code} - ${s.activity.plan.project.name}`,
      s.activity.plan.procurementCategory ?? '',
      s.activity.procurementMethod.label,
      s.activity.plan.creator.displayName,
      s.stageType.label,
      fmtDate(s.currentTargetEndDate),
      delayDays,
      funding,
      s.activity.status,
      s.remarks || lastRev?.reason || '',
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #7: Quarterly Detailed Procurement Report (P1) ────────────────────
export async function streamQuarterlyDetailedProcurement(
  res: Response,
  query: QuarterlyDetailedQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  const {
    projectId,
    planId,
    category,
    methodId,
    fundingSourceId,
    region,
    officerId,
    supplierId,
    contractStatus,
    activityStatus,
    dateFrom,
    dateTo,
    page,
    limit,
  } = query;

  const where = {
    ...(isDirector ? {} : { plan: { createdBy: userId } }),
    ...(projectId ? { plan: { projectId } } : {}),
    ...(planId ? { planId } : {}),
    ...(category ? { plan: { procurementCategory: category } } : {}),
    ...(methodId ? { procurementMethodId: methodId } : {}),
    ...(fundingSourceId ? { plan: { project: { fundingSourceId } } } : {}),
    ...(region ? { contracts: { some: { region } } } : {}),
    ...(officerId ? { plan: { createdBy: officerId } } : {}),
    ...(supplierId ? { contracts: { some: { supplierId } } } : {}),
    ...(contractStatus
      ? { contracts: { some: { status: contractStatus as ContractStatus } } }
      : {}),
    ...(activityStatus ? { status: activityStatus as ActivityStatus } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const activities = await prisma.activity.findMany({
    where,
    include: {
      procurementMethod: { select: { label: true } },
      plan: {
        select: {
          title: true,
          procurementCategory: true,
          creator: { select: { displayName: true } },
          project: {
            select: {
              code: true,
              name: true,
              fundingSource: { select: { label: true } },
            },
          },
        },
      },
      contracts: {
        where: { deletedAt: null },
        include: {
          supplier: { select: { name: true } },
          payments: { select: { referenceNo: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      fundings: { select: { fundingSource: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `quarterly_detailed_procurement_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Quarterly Detailed Procurement', [
    'No.',
    'Procurement Description',
    'Procurement Method',
    'Winning Supplier / Contractor',
    'Winning / Award Amount',
    'Budget Type',
    'Funding Source',
    'Purchase Order / PV Number',
    'Receipt / Delivery Status',
    'Receipt / Completion Date',
    'Project',
    'Region',
    'Officer',
  ]);

  let rowNumber = (page - 1) * limit + 1;

  for (const a of activities) {
    const primaryContract = a.contracts[0];
    const budgetType =
      primaryContract?.budgetType ||
      a.fundings.map((f) => f.fundingSource).join(', ') ||
      'Recurrent';

    const fundingSource =
      a.fundings.length > 0
        ? a.fundings.map((f) => f.fundingSource).join(', ')
        : a.plan.project.fundingSource.label;

    const poPvNumber =
      primaryContract?.purchaseOrderNo ||
      primaryContract?.payments[0]?.referenceNo ||
      primaryContract?.contractNo ||
      '';

    const awardAmount = primaryContract
      ? `${primaryContract.currency} ${fmtDecimal(primaryContract.totalValue)}`
      : '';

    sheet.addRow([
      rowNumber++,
      a.description || a.reference,
      a.procurementMethod.label,
      primaryContract?.supplier?.name ?? 'Not Awarded',
      awardAmount,
      budgetType,
      fundingSource,
      poPvNumber,
      primaryContract?.status ?? a.status,
      fmtDate(primaryContract?.actualCompletionDate),
      `${a.plan.project.code} - ${a.plan.project.name}`,
      primaryContract?.region || 'National',
      a.plan.creator.displayName,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// Legacy alias
export const streamDetailedProcurement = streamQuarterlyDetailedProcurement;

// ─── Legacy Activity Milestone Report ─────────────────────────────────────────
export async function streamActivityMilestone(
  res: Response,
  query: ActivityMilestoneQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  return streamQuarterlyDetailedProcurement(res, query, userId, isDirector);
}
