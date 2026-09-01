import type { Response } from 'express';
import type { PlanStatus } from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/database.js';
import { excelService } from '../../excel/excel.service.js';
import type {
  MonthlySummaryQuery,
  ProjectOfficerSummaryQuery,
} from '../reports.schema.js';

const { createStreamingWorkbook, fmtDate } = excelService;

// ─── Report #5: Monthly Summary ───────────────────────────────────────────────
export async function streamMonthlySummary(
  res: Response,
  query: MonthlySummaryQuery,
): Promise<void> {
  const {
    year,
    quarter,
    projectId,
    category,
    methodId,
    fundingSourceId,
    region,
    officerId,
  } = query;

  const planFilter = {
    ...(projectId ? { projectId } : {}),
    ...(category ? { procurementCategory: category } : {}),
    ...(officerId ? { createdBy: officerId } : {}),
    project: {
      ...(fundingSourceId ? { fundingSourceId } : {}),
    },
  };

  const activityWhere = {
    plan: planFilter,
    ...(methodId ? { procurementMethodId: methodId } : {}),
    ...(region ? { contracts: { some: { region } } } : {}),
    createdAt: {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31`),
    },
  };

  const activities = await prisma.activity.findMany({
    where: activityWhere,
    include: {
      procurementMethod: { select: { label: true } },
      plan: {
        select: {
          procurementCategory: true,
          project: {
            select: {
              name: true,
              fundingSource: { select: { label: true, code: true } },
            },
          },
        },
      },
      contracts: {
        where: { deletedAt: null },
        include: {
          payments: {
            where: { deletedAt: null, status: 'PAID' },
            select: { amount: true },
          },
        },
      },
      stages: {
        where: { isNotApplicable: false },
        select: {
          status: true,
          currentTargetEndDate: true,
          actualEndDate: true,
        },
      },
    },
  });

  let filtered = activities;
  if (quarter) {
    const qStart = (quarter - 1) * 3;
    const qEnd = qStart + 2;
    filtered = activities.filter((a) => {
      const m = a.createdAt.getMonth();
      return m >= qStart && m <= qEnd;
    });
  }

  const filename = `monthly_summary_${year}${quarter ? '_Q' + quarter : ''}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  // KPI calculations
  const totalPlanned = filtered.reduce(
    (s, a) => s + Number(a.estimatedBudget),
    0,
  );
  const contracts = filtered.flatMap((a) => a.contracts);
  const totalContractVal = contracts.reduce(
    (s, c) => s + Number(c.contractAmountWithVat || c.totalValue),
    0,
  );
  const totalPaid = contracts.reduce(
    (s, c) => s + c.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    0,
  );
  const remaining = totalContractVal - totalPaid;

  const allStages = filtered.flatMap((a) => a.stages);
  const completedCount = allStages.filter(
    (s) => s.status === 'COMPLETED',
  ).length;
  const ongoingCount = allStages.filter(
    (s) => s.status === 'IN_PROGRESS' || s.status === 'NOT_STARTED',
  ).length;
  const delayedCount = allStages.filter((s) => {
    const today = new Date();
    return (
      (s.status === 'COMPLETED' &&
        s.actualEndDate &&
        s.currentTargetEndDate &&
        s.actualEndDate > s.currentTargetEndDate) ||
      (s.status !== 'COMPLETED' &&
        s.currentTargetEndDate &&
        s.currentTargetEndDate < today)
    );
  }).length;

  // Sheet 1: Dashboard KPIs
  const kpiSheet = addSheet('Dashboard KPIs', ['Metric', 'Value']);
  kpiSheet.addRow(['Total Activities', filtered.length]);
  kpiSheet.addRow(['Total Planned Value (ETB)', totalPlanned.toFixed(2)]);
  kpiSheet.addRow(['Total Contract Value (ETB)', totalContractVal.toFixed(2)]);
  kpiSheet.addRow(['Total Paid (ETB)', totalPaid.toFixed(2)]);
  kpiSheet.addRow(['Remaining Balance (ETB)', remaining.toFixed(2)]);
  kpiSheet.addRow(['Completed Stages', completedCount]);
  kpiSheet.addRow(['Ongoing Stages', ongoingCount]);
  kpiSheet.addRow(['Delayed Stages', delayedCount]);

  // Sheet 2: Category & Method
  const catMethodSheet = addSheet('Category & Method', [
    'Category',
    'Method',
    '# Activities',
    'Planned Value',
  ]);
  const catMethodMap = new Map<string, { count: number; value: number }>();
  for (const a of filtered) {
    const key = `${a.plan.procurementCategory || 'N/A'}::${a.procurementMethod.label}`;
    const entry = catMethodMap.get(key) || { count: 0, value: 0 };
    entry.count += 1;
    entry.value += a.estimatedBudget;
    catMethodMap.set(key, entry);
  }
  for (const [key, val] of catMethodMap.entries()) {
    const [cat, met] = key.split('::');
    catMethodSheet.addRow([cat, met, val.count, val.value.toFixed(2)]);
  }

  // Sheet 3: Funding Sources
  const fundingSheet = addSheet('Funding Sources', [
    'Funding Group',
    '# Activities',
    'Planned Value',
  ]);
  const fundingMap = new Map<string, { count: number; value: number }>();
  for (const a of filtered) {
    const label = a.plan.project.fundingSource.label || 'Other';
    const entry = fundingMap.get(label) || { count: 0, value: 0 };
    entry.count += 1;
    entry.value += a.estimatedBudget;
    fundingMap.set(label, entry);
  }
  for (const [label, val] of fundingMap.entries()) {
    fundingSheet.addRow([label, val.count, val.value.toFixed(2)]);
  }

  // Sheet 4: Monthly Breakdown
  const monthlySheet = addSheet('Monthly Breakdown', [
    'Month',
    '# Activities',
    'Planned Budget',
    'Total Paid',
  ]);
  const monthlyMap = new Map<
    number,
    { count: number; planned: number; paid: number }
  >();
  for (let m = 0; m < 12; m++) {
    monthlyMap.set(m, { count: 0, planned: 0, paid: 0 });
  }
  for (const a of filtered) {
    const m = a.createdAt.getMonth();
    const entry = monthlyMap.get(m)!;
    entry.count += 1;
    entry.planned += a.estimatedBudget;
    entry.paid += a.contracts.reduce(
      (sum, c) =>
        sum + c.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
      0,
    );
  }
  for (let m = 0; m < 12; m++) {
    const entry = monthlyMap.get(m)!;
    if (quarter) {
      const qStart = (quarter - 1) * 3;
      const qEnd = qStart + 2;
      if (m < qStart || m > qEnd) continue;
    }
    const monthLabel = new Date(year, m, 1).toLocaleString('default', {
      month: 'long',
    });
    monthlySheet.addRow([
      monthLabel,
      entry.count,
      entry.planned.toFixed(2),
      entry.paid.toFixed(2),
    ]);
  }

  await (kpiSheet as unknown as { commit: () => Promise<void> }).commit();
  await (catMethodSheet as unknown as { commit: () => Promise<void> }).commit();
  await (fundingSheet as unknown as { commit: () => Promise<void> }).commit();
  await (monthlySheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #8: Project & Officer Summary ─────────────────────────────────────
export async function streamProjectOfficerSummary(
  res: Response,
  query: ProjectOfficerSummaryQuery,
): Promise<void> {
  const {
    projectId,
    officerId,
    region,
    budgetYear,
    category,
    methodId,
    fundingSourceId,
    status,
    page,
    limit,
  } = query;

  const where = {
    isActive: true,
    ...(budgetYear ? { budgetYear } : {}),
    ...(projectId ? { projectId } : {}),
    ...(officerId ? { createdBy: officerId } : {}),
    ...(category ? { procurementCategory: category } : {}),
    ...(status ? { status: status as PlanStatus } : {}),
    project: {
      ...(fundingSourceId ? { fundingSourceId } : {}),
    },
    ...(region || methodId
      ? {
          activities: {
            some: {
              ...(methodId ? { procurementMethodId: methodId } : {}),
              ...(region ? { contracts: { some: { region } } } : {}),
            },
          },
        }
      : {}),
  };

  const plans = await prisma.plan.findMany({
    where,
    include: {
      creator: { select: { displayName: true } },
      project: { select: { id: true, code: true, name: true } },
      activities: {
        include: {
          stages: {
            where: { isNotApplicable: false },
            select: {
              status: true,
              currentTargetEndDate: true,
              actualEndDate: true,
            },
          },
          contracts: {
            where: { deletedAt: null },
            select: {
              totalValue: true,
              contractAmountWithVat: true,
              vatRate: true,
              payments: {
                where: { deletedAt: null, status: 'PAID' },
                select: { amount: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ createdBy: 'asc' }, { createdAt: 'desc' }],
  });

  // Group plans by officer
  type GroupKey = string;
  const groups = new Map<GroupKey, typeof plans>();
  for (const plan of plans) {
    const key = plan.createdBy;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(plan);
  }

  const officerGroups = Array.from(groups.values());
  const paginated = officerGroups.slice((page - 1) * limit, page * limit);

  const filename = `project_officer_summary_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Project & Officer Summary', [
    'Officer',
    'Projects Assigned',
    'Plans',
    'Activities',
    'Planned Value',
    'Awarded Value',
    'Contract Value',
    'Completed',
    'In Progress',
    'Delayed',
    'Total Paid',
    'Remaining Balance',
  ]);

  for (const groupPlans of paginated) {
    const first = groupPlans[0]!;
    const uniqueProjects = new Set(groupPlans.map((p) => p.project.code));
    const allActivities = groupPlans.flatMap((p) => p.activities);
    const allStages = allActivities.flatMap((a) => a.stages);

    const completedCount = allStages.filter(
      (s) => s.status === 'COMPLETED',
    ).length;
    const inProgressCount = allStages.filter(
      (s) => s.status === 'IN_PROGRESS' || s.status === 'NOT_STARTED',
    ).length;

    const today = new Date();
    const delayedCount = allStages.filter((s) => {
      return (
        (s.status === 'COMPLETED' &&
          s.actualEndDate &&
          s.currentTargetEndDate &&
          s.actualEndDate > s.currentTargetEndDate) ||
        (s.status !== 'COMPLETED' &&
          s.currentTargetEndDate &&
          s.currentTargetEndDate < today)
      );
    }).length;

    const plannedValue = allActivities.reduce(
      (s, a) => s + Number(a.estimatedBudget),
      0,
    );
    const allContracts = allActivities.flatMap((a) => a.contracts);
    const awardedValue = allContracts.reduce(
      (s, c) => s + Number(c.totalValue),
      0,
    );
    const contractValue = allContracts.reduce((s, c) => {
      const val = c.contractAmountWithVat
        ? Number(c.contractAmountWithVat)
        : Number(c.totalValue) * (1 + (c.vatRate ?? 0) / 100);
      return s + val;
    }, 0);
    const totalPaid = allContracts.reduce((s, c) => {
      return s + c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    }, 0);

    sheet.addRow([
      first.creator.displayName,
      uniqueProjects.size,
      groupPlans.length,
      allActivities.length,
      plannedValue.toFixed(2),
      awardedValue.toFixed(2),
      contractValue.toFixed(2),
      completedCount,
      inProgressCount,
      delayedCount,
      totalPaid.toFixed(2),
      (contractValue - totalPaid).toFixed(2),
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}
