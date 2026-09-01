import type { Response } from 'express';
import type {
  ActivityStatus,
  ContractStatus,
  StageStatus,
} from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/database.js';
import { excelService } from '../../excel/excel.service.js';
import type {
  DetailedProcurementQuery,
  ProcurementStepQuery,
  DelayedProcurementQuery,
  ActivityMilestoneQuery,
} from '../reports.schema.js';

const { createStreamingWorkbook, fmtDecimal, fmtDate } = excelService;

// ─── Report #7: Detailed Procurement ──────────────────────────────────────────
export async function streamDetailedProcurement(
  res: Response,
  query: DetailedProcurementQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  const {
    projectId,
    planId,
    activityId,
    category,
    methodId,
    marketApproach,
    reviewType,
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
    ...(activityId ? { id: activityId } : {}),
    ...(category ? { plan: { procurementCategory: category } } : {}),
    ...(methodId ? { procurementMethodId: methodId } : {}),
    ...(marketApproach ? { marketApproach } : {}),
    ...(reviewType ? { reviewType } : {}),
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
          project: {
            select: {
              name: true,
              fundingSource: { select: { label: true } },
            },
          },
        },
      },
      contracts: {
        where: { deletedAt: null },
        include: { supplier: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      fundings: { select: { fundingSource: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `detailed_procurement_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Detailed Procurement', [
    'Project',
    'Plan',
    'Activity Reference',
    'Activity Description',
    'Procurement Type',
    'Category',
    'Method',
    'Market Approach',
    'Review Type',
    'Funding Source',
    'Budget Type',
    'Estimated Amount',
    'Winner/Supplier',
    'Awarded Amount',
    'Contract Amount',
    'Contract Status',
    'Completion/Receipt Date',
  ]);

  for (const a of activities) {
    const primaryContract = a.contracts[0];
    const budgetType = a.fundings.map((f) => f.fundingSource).join('; ');

    sheet.addRow([
      a.plan.project.name,
      a.plan.title,
      a.reference,
      a.description ?? '',
      a.plan.procurementCategory ?? '',
      a.plan.procurementCategory ?? '',
      a.procurementMethod.label,
      a.marketApproach ?? '',
      a.reviewType ?? '',
      a.plan.project.fundingSource.label,
      budgetType,
      fmtDecimal(a.estimatedBudget),
      primaryContract?.supplier?.name ?? '',
      primaryContract ? fmtDecimal(primaryContract.totalValue) : '',
      primaryContract
        ? fmtDecimal(
            primaryContract.contractAmountWithVat || primaryContract.totalValue,
          )
        : '',
      primaryContract?.status ?? '',
      primaryContract?.actualCompletionDate
        ? fmtDate(primaryContract.actualCompletionDate)
        : '',
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #3: Procurement STEP Report ───────────────────────────────────────
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
    stageTypeId,
    stageStatus,
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
      ...(activityStatus ? { status: activityStatus as ActivityStatus } : {}),
      ...(methodId ? { procurementMethodId: methodId } : {}),
      ...(marketApproach ? { marketApproach } : {}),
      ...(reviewType ? { reviewType } : {}),
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

  const sheet = addSheet('STEP Report', [
    'Activity Reference',
    'Activity Description',
    'Method',
    'Market Approach',
    'Review Type',
    'Stage',
    'Planned Date',
    'Revised Date',
    'Actual Date',
    'Stage Status',
    'Delay Days',
    'Process Status',
    'Activity Status',
  ]);

  for (const s of stages) {
    const today = new Date();
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

    sheet.addRow([
      s.activity.reference,
      s.activity.description ?? '',
      s.activity.procurementMethod.label,
      s.activity.marketApproach ?? '',
      s.activity.reviewType ?? '',
      s.stageType.label,
      fmtDate(s.plannedEndDate),
      fmtDate(s.currentTargetEndDate),
      fmtDate(s.actualEndDate),
      s.status,
      delayDays,
      s.activity.processStatus ?? '',
      s.activity.status,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #4: Delayed Procurement ───────────────────────────────────────────
export async function streamDelayedProcurement(
  res: Response,
  query: DelayedProcurementQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  const {
    projectId,
    planId,
    category,
    methodId,
    officerId,
    region,
    fundingSourceId,
    activityStatus,
    stageTypeId,
    minDelayDays,
    delayBucket,
    dateFrom,
    dateTo,
    page,
    limit,
  } = query;

  const today = new Date();

  const planFilter = {
    ...(isDirector ? {} : { createdBy: userId }),
    ...(planId ? { id: planId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(category ? { procurementCategory: category } : {}),
    ...(officerId ? { createdBy: officerId } : {}),
    project: {
      ...(fundingSourceId ? { fundingSourceId } : {}),
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
      ...(activityStatus ? { status: activityStatus as ActivityStatus } : {}),
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
      revisions: { orderBy: { revisionNo: 'asc' } },
      activity: {
        include: {
          plan: {
            include: {
              project: { select: { name: true } },
              creator: { select: { displayName: true } },
            },
          },
        },
      },
    },
    orderBy: { currentTargetEndDate: 'asc' },
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
    });

  const paginated = computed.slice((page - 1) * limit, page * limit);

  const filename = `delayed_procurement_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Delayed Procurement', [
    'Project',
    'Activity',
    'Officer',
    'Stage',
    'Original Target',
    'Current Target',
    'Actual Date',
    'Delay Days',
    'Process Status',
    'Reason',
    'Remarks',
  ]);

  for (const { stage: s, delayDays } of paginated) {
    const lastRev = s.revisions[s.revisions.length - 1];
    sheet.addRow([
      s.activity.plan.project.name,
      `${s.activity.reference} - ${s.activity.description ?? ''}`,
      s.activity.plan.creator.displayName,
      s.stageType.label,
      fmtDate(s.plannedEndDate),
      fmtDate(s.currentTargetEndDate),
      fmtDate(s.actualEndDate),
      delayDays,
      s.status,
      lastRev?.reason ?? '',
      s.remarks ?? '',
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #9: Activity Milestone Report ─────────────────────────────────────
// One Excel sheet per procurement method (e.g. DIR, RFQ, RFB, QCBS-FBS-LCS)
// matching the multi-tab format the client uses.
export async function streamActivityMilestone(
  res: Response,
  query: ActivityMilestoneQuery,
  userId: string,
  isDirector: boolean,
): Promise<void> {
  const {
    projectId,
    planId,
    budgetYear,
    category,
    methodId,
    marketApproach,
    reviewType,
    fundingSourceId,
    officerId,
    activityStatus,
    contractStatus,
    supplierId,
    dateFrom,
    dateTo,
    page,
    limit,
  } = query;

  const where = {
    ...(isDirector ? {} : { plan: { createdBy: userId } }),
    ...(projectId ? { plan: { projectId } } : {}),
    ...(planId ? { planId } : {}),
    ...(budgetYear ? { plan: { budgetYear } } : {}),
    ...(category ? { plan: { procurementCategory: category } } : {}),
    ...(methodId ? { procurementMethodId: methodId } : {}),
    ...(marketApproach ? { marketApproach } : {}),
    ...(reviewType ? { reviewType } : {}),
    ...(fundingSourceId ? { plan: { project: { fundingSourceId } } } : {}),
    ...(officerId ? { plan: { createdBy: officerId } } : {}),
    ...(activityStatus ? { status: activityStatus as ActivityStatus } : {}),
    ...(supplierId ? { contracts: { some: { supplierId } } } : {}),
    ...(contractStatus
      ? { contracts: { some: { status: contractStatus as ContractStatus } } }
      : {}),
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
      procurementMethod: { select: { label: true, code: true } },
      plan: {
        select: {
          title: true,
          budgetYear: true,
          procurementCategory: true,
          project: {
            select: {
              name: true,
              code: true,
              sapIdentificationNo: true,
              fundingSource: { select: { label: true } },
            },
          },
          creator: { select: { displayName: true } },
        },
      },
      stages: {
        where: { isNotApplicable: false },
        include: { stageType: { select: { label: true, code: true } } },
        orderBy: { sequence: 'asc' },
      },
      contracts: {
        where: { deletedAt: null },
        include: { supplier: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      fundings: { select: { fundingSource: true } },
    },
    // Sort by method first so sheet grouping is natural
    orderBy: [{ procurementMethodId: 'asc' }, { createdAt: 'desc' }],
    skip: (page - 1) * limit,
    take: limit,
  });

  // ── Group activities by procurement method (each group → one sheet) ─────────
  type MethodGroup = { label: string; activities: typeof activities };
  const methodGroups = new Map<string, MethodGroup>();

  for (const a of activities) {
    const code = a.procurementMethod.code;
    if (!methodGroups.has(code)) {
      methodGroups.set(code, {
        label: a.procurementMethod.label,
        activities: [],
      });
    }
    methodGroups.get(code)!.activities.push(a);
  }

  // ── Fixed headers (same on every sheet) ────────────────────────────────────
  const fixedHeaders = [
    'Activity Reference / Description',
    'In Process',
    'Cost / Oracle No',
    'Completed',
    'Process Type',
    'Procurement Category',
    'Indicator Option',
    'Allocation Amount (ETB)',
    'STEP / BIS Link',
    'Procurement Manager',
    'Process Status',
    'Activity Status',
  ];

  const trailingHeaders = [
    'Supplier / Contractor',
    'Contract No',
    'Contract Amount (ETB)',
    'Contract Signature Date',
    'Contract Completion Date',
    'Contract Status',
    'Contract Termination',
  ];

  // ── Row builder — uses the stage types specific to this sheet ──────────────
  function buildRow(
    a: (typeof activities)[0],
    orderedStageTypes: { id: string; label: string; avgSeq: number }[],
  ): (string | number)[] {
    const contract = a.contracts[0];
    const stageByTypeId = new Map(a.stages.map((s) => [s.stageTypeId, s]));

    const fixedCells: (string | number)[] = [
      `${a.reference}${a.description ? ' / ' + a.description : ''}`,
      a.status === 'IN_PROGRESS' ? 'Yes' : '',
      a.plan.project.sapIdentificationNo ?? '',
      a.status === 'COMPLETED' ? 'Yes' : '',
      a.procurementProcess ?? '',
      a.plan.procurementCategory ?? '',
      a.domesticPreference ?? '',
      fmtDecimal(a.estimatedBudget),
      a.bidReferenceNo ?? '',
      a.plan.creator.displayName,
      a.processStatus ?? '',
      a.status,
    ];

    const stageCells: string[] = [];
    for (const st of orderedStageTypes) {
      const stage = stageByTypeId.get(st.id);
      stageCells.push(
        fmtDate(stage?.currentTargetEndDate ?? stage?.plannedEndDate),
      );
      stageCells.push(fmtDate(stage?.actualEndDate));
    }

    const contractWithVat = contract
      ? contract.contractAmountWithVat
        ? Number(contract.contractAmountWithVat)
        : Number(contract.totalValue) *
          (1 +
            ((contract as unknown as { vatRate?: number }).vatRate ?? 0) / 100)
      : null;

    const trailingCells: string[] = [
      contract?.supplier?.name ?? '',
      contract?.contractNo ?? '',
      contractWithVat !== null ? contractWithVat.toFixed(2) : '',
      fmtDate(contract?.signatureDate),
      fmtDate(contract?.actualCompletionDate),
      contract?.status ?? '',
      '', // Contract Termination
    ];

    return [...fixedCells, ...stageCells, ...trailingCells];
  }

  const filename = `activity_milestone_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheets: ReturnType<typeof addSheet>[] = [];

  for (const [, group] of methodGroups) {
    type StageTypeMeta = { id: string; label: string; avgSeq: number };
    const stageTypeMap = new Map<string, StageTypeMeta>();

    for (const a of group.activities) {
      for (const s of a.stages) {
        const existing = stageTypeMap.get(s.stageTypeId);
        if (!existing) {
          stageTypeMap.set(s.stageTypeId, {
            id: s.stageTypeId,
            label: s.stageType.label,
            avgSeq: s.sequence,
          });
        } else {
          existing.avgSeq = (existing.avgSeq + s.sequence) / 2;
        }
      }
    }

    const orderedStageTypes = Array.from(stageTypeMap.values()).sort(
      (a, b) => a.avgSeq - b.avgSeq,
    );

    const stageHeaders: string[] = [];
    for (const st of orderedStageTypes) {
      stageHeaders.push(`${st.label} (Planned)`);
      stageHeaders.push(`${st.label} (Actual)`);
    }

    const allHeaders = [...fixedHeaders, ...stageHeaders, ...trailingHeaders];

    const sheetName = group.label.substring(0, 31);
    const sheet = addSheet(sheetName, allHeaders);

    for (const a of group.activities) {
      sheet.addRow(buildRow(a, orderedStageTypes));
    }

    sheets.push(sheet);
  }

  for (const sheet of sheets) {
    await (sheet as unknown as { commit: () => Promise<void> }).commit();
  }
  await finalize();
}
