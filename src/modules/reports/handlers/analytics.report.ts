import type { Response } from 'express';
import type { PlanStatus } from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/database.js';
import { excelService } from '../../excel/excel.service.js';
import type {
  MonthlyProcurementQuery,
  MonthlySummaryQuery,
  QuarterlySummaryQuery,
  RegionalSectorSummaryQuery,
  ProjectSummaryQuery,
  OfficerSummaryQuery,
} from '../reports.schema.js';

const { createStreamingWorkbook, fmtDecimal, fmtDate } = excelService;

// ─── Report #5: Monthly Procurement Report (P0) ───────────────────────────────
export async function streamMonthlyProcurementReport(
  res: Response,
  query: MonthlyProcurementQuery,
): Promise<void> {
  const {
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    budgetYear,
    fiscalYear,
    projectId,
    sector,
    region,
    category,
    methodId,
    fundingSourceId,
    officerId,
    status,
    page,
    limit,
  } = query;

  const targetYear = budgetYear || fiscalYear;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const monthLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const where = {
    isActive: true,
    ...(methodId ? { procurementMethodId: methodId } : {}),
    ...(region ? { contracts: { some: { region } } } : {}),
    plan: {
      ...(targetYear ? { budgetYear: targetYear } : {}),
      ...(projectId ? { projectId } : {}),
      ...(category ? { procurementCategory: category } : {}),
      ...(officerId ? { createdBy: officerId } : {}),
      project: {
        ...(fundingSourceId ? { fundingSourceId } : {}),
        ...(sector ? { sector: { label: sector } } : {}),
      },
    },
    ...(status ? { status: status as any } : {}),
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
          project: { select: { code: true, name: true } },
        },
      },
      contracts: {
        where: { deletedAt: null },
        select: { totalValue: true, currency: true },
      },
      stages: {
        where: { isNotApplicable: false },
        include: { stageType: { select: { label: true } } },
        orderBy: { sequence: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `monthly_procurement_report_${year}_m${month}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Monthly Procurement Progress', [
    'Reporting Month',
    'Activity Reference',
    'Activity Description',
    'Project',
    'Category',
    'Procurement Method',
    'Responsible Officer',
    'Current Status',
    'Achievement / Completed Stage',
    'Procurement Value',
    'Delay (Days / Reason)',
    'Remarks / Next Activity',
  ]);

  const today = new Date();

  for (const a of activities) {
    // Completed stage during this reporting month
    const completedThisMonth = a.stages.filter(
      (s) =>
        s.status === 'COMPLETED' &&
        s.actualEndDate &&
        s.actualEndDate >= startDate &&
        s.actualEndDate <= endDate,
    );

    const achievementStr =
      completedThisMonth.length > 0
        ? completedThisMonth.map((s) => s.stageType.label).join('; ')
        : 'None in period';

    // Value (contract value if awarded, else estimated)
    const primaryContract = a.contracts[0];
    const valueStr = primaryContract
      ? `${primaryContract.currency} ${fmtDecimal(primaryContract.totalValue)}`
      : `${a.currency || 'ETB'} ${fmtDecimal(a.estimatedBudget)}`;

    // Delay calculation
    let delayInfo = 'On Track';
    const overdueStage = a.stages.find(
      (s) =>
        s.status !== 'COMPLETED' &&
        s.currentTargetEndDate &&
        s.currentTargetEndDate < today,
    );
    if (overdueStage && overdueStage.currentTargetEndDate) {
      const diff = Math.round(
        (today.getTime() - overdueStage.currentTargetEndDate.getTime()) /
          86_400_000,
      );
      delayInfo = `${diff} days overdue (${overdueStage.stageType.label})`;
    }

    // Next scheduled activity/stage
    const nextStage = a.stages.find((s) => s.status !== 'COMPLETED');
    const nextStr = nextStage
      ? `Next: ${nextStage.stageType.label} (Target: ${fmtDate(nextStage.currentTargetEndDate)})`
      : a.remarks || 'All stages completed';

    sheet.addRow([
      monthLabel,
      a.reference,
      a.description ?? '',
      `${a.plan.project.code} - ${a.plan.project.name}`,
      a.plan.procurementCategory ?? '',
      a.procurementMethod.label,
      a.plan.creator.displayName,
      a.status,
      achievementStr,
      valueStr,
      delayInfo,
      nextStr,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #6: Quarterly Procurement Summary (P0) ────────────────────────────
export async function streamQuarterlyProcurementSummary(
  res: Response,
  query: QuarterlySummaryQuery,
): Promise<void> {
  const {
    quarter,
    year = new Date().getFullYear(),
    budgetYear,
    fiscalYear,
    projectId,
    sector,
    region,
    fundingSourceId,
    fundingType,
    category,
    methodId,
  } = query;

  const targetYear = budgetYear || fiscalYear;

  const where = {
    isActive: true,
    ...(methodId ? { procurementMethodId: methodId } : {}),
    ...(region ? { contracts: { some: { region } } } : {}),
    plan: {
      ...(targetYear ? { budgetYear: targetYear } : {}),
      ...(projectId ? { projectId } : {}),
      ...(category ? { procurementCategory: category } : {}),
      project: {
        ...(fundingSourceId ? { fundingSourceId } : {}),
        ...(fundingType ? { fundingType } : {}),
        ...(sector ? { sector: { label: sector } } : {}),
      },
    },
  };

  const activities = await prisma.activity.findMany({
    where,
    include: {
      procurementMethod: { select: { label: true } },
      plan: {
        select: {
          procurementCategory: true,
          project: {
            select: {
              code: true,
              name: true,
              fundingType: true,
              fundingSource: { select: { label: true } },
            },
          },
        },
      },
      contracts: {
        where: { deletedAt: null },
        select: { totalValue: true, currency: true },
      },
    },
  });

  const periodLabel = quarter ? `Q${quarter} ${year}` : `${year} Annual`;
  const filename = `quarterly_procurement_summary_${year}${quarter ? '_Q' + quarter : ''}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Quarterly Summary Matrix', [
    'Procurement Method',
    'Category',
    'Funding Type',
    'Package / Order Count',
    'Total Value',
    'Currency',
    'Reporting Period',
  ]);

  // Aggregate key: Method::Category::FundingType::Currency
  type AggEntry = { count: number; value: number };
  const matrix = new Map<string, AggEntry>();

  for (const a of activities) {
    const met = a.procurementMethod.label;
    const cat = a.plan.procurementCategory || 'Uncategorized';
    const fund = a.plan.project.fundingType || a.plan.project.fundingSource.label || 'Treasury';
    const cur = a.currency || 'ETB';

    const key = `${met}:::${cat}:::${fund}:::${cur}`;
    const curr = matrix.get(key) || { count: 0, value: 0 };
    curr.count += 1;
    curr.value += Number(a.estimatedBudget);
    matrix.set(key, curr);
  }

  for (const [key, val] of matrix.entries()) {
    const [met, cat, fund, cur] = key.split(':::');
    sheet.addRow([
      met,
      cat,
      fund,
      val.count,
      fmtDecimal(val.value),
      cur,
      periodLabel,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #10: Regional / Sector Summary (P0) ───────────────────────────────
export async function streamRegionalSectorSummary(
  res: Response,
  query: RegionalSectorSummaryQuery,
): Promise<void> {
  const {
    fiscalYear,
    budgetYear,
    groupBy = 'REGION',
    projectId,
    fundingSourceId,
    status,
    category,
    methodId,
  } = query;

  const targetYear = budgetYear || fiscalYear;

  const activities = await prisma.activity.findMany({
    where: {
      isActive: true,
      ...(methodId ? { procurementMethodId: methodId } : {}),
      ...(status ? { status: status as any } : {}),
      plan: {
        ...(targetYear ? { budgetYear: targetYear } : {}),
        ...(projectId ? { projectId } : {}),
        ...(category ? { procurementCategory: category } : {}),
        project: {
          ...(fundingSourceId ? { fundingSourceId } : {}),
        },
      },
    },
    include: {
      stages: {
        where: { isNotApplicable: false },
        select: { status: true, currentTargetEndDate: true, actualEndDate: true },
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
      plan: {
        select: {
          project: {
            select: {
              organization: true,
              sector: { select: { label: true } },
            },
          },
        },
      },
    },
  });

  const filename = `regional_sector_summary_${groupBy.toLowerCase()}_${targetYear ?? 'all'}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Organizational Summary', [
    'Organization / Sector / Region',
    'Total Activities',
    'Completed',
    'In Progress / Ongoing',
    'Delayed',
    'Cancelled',
    'Estimated Amount (ETB)',
    'Contracted Amount (ETB)',
    'Paid Amount (ETB)',
    'Remaining Balance (ETB)',
    'Progress %',
    'Delay Measure',
  ]);

  type OrgStats = {
    name: string;
    total: number;
    completed: number;
    ongoing: number;
    delayed: number;
    cancelled: number;
    estimated: number;
    contracted: number;
    paid: number;
    delayDaysSum: number;
    delayCount: number;
  };

  const groups = new Map<string, OrgStats>();
  const today = new Date();

  for (const a of activities) {
    let groupKey = 'National / Central';
    if (groupBy === 'SECTOR') {
      groupKey = a.plan.project.sector.label || 'Other Sector';
    } else if (groupBy === 'ORGANIZATION') {
      groupKey = a.plan.project.organization || 'Ministry Head Office';
    } else {
      // REGION
      const contractRegion = a.contracts[0]?.region;
      groupKey = contractRegion || a.plan.project.organization || 'Addis Ababa';
    }

    const s = groups.get(groupKey) || {
      name: groupKey,
      total: 0,
      completed: 0,
      ongoing: 0,
      delayed: 0,
      cancelled: 0,
      estimated: 0,
      contracted: 0,
      paid: 0,
      delayDaysSum: 0,
      delayCount: 0,
    };

    s.total += 1;
    if (a.status === 'COMPLETED') s.completed += 1;
    else if (a.status === 'CANCELLED') s.cancelled += 1;
    else s.ongoing += 1;

    // Check delayed
    const isDelayed = a.stages.some((st) => {
      if (st.status === 'COMPLETED' && st.actualEndDate && st.currentTargetEndDate) {
        return st.actualEndDate > st.currentTargetEndDate;
      }
      return st.status !== 'COMPLETED' && st.currentTargetEndDate && st.currentTargetEndDate < today;
    });
    if (isDelayed) s.delayed += 1;

    s.estimated += Number(a.estimatedBudget);

    for (const c of a.contracts) {
      const cVal = Number(c.contractAmountWithVat || c.totalValue);
      s.contracted += cVal;
      const cPaid = c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      s.paid += cPaid;
    }

    groups.set(groupKey, s);
  }

  for (const s of groups.values()) {
    const remaining = Math.max(0, s.contracted - s.paid);
    const progressPct =
      s.total > 0 ? ((s.completed / s.total) * 100).toFixed(1) + '%' : '0.0%';
    const delayMeasure = `${s.delayed} packages overdue`;

    sheet.addRow([
      s.name,
      s.total,
      s.completed,
      s.ongoing,
      s.delayed,
      s.cancelled,
      s.estimated.toFixed(2),
      s.contracted.toFixed(2),
      s.paid.toFixed(2),
      remaining.toFixed(2),
      progressPct,
      delayMeasure,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #11: Project Summary (P0) ─────────────────────────────────────────
export async function streamProjectSummary(
  res: Response,
  query: ProjectSummaryQuery,
): Promise<void> {
  const {
    fiscalYear,
    budgetYear,
    projectId,
    region,
    sector,
    fundingSourceId,
    category,
    methodId,
    status,
  } = query;

  const targetYear = budgetYear || fiscalYear;

  const projects = await prisma.project.findMany({
    where: {
      isActive: true,
      ...(projectId ? { id: projectId } : {}),
      ...(fundingSourceId ? { fundingSourceId } : {}),
      ...(sector ? { sector: { label: sector } } : {}),
    },
    include: {
      plans: {
        where: {
          isActive: true,
          ...(targetYear ? { budgetYear: targetYear } : {}),
          ...(category ? { procurementCategory: category } : {}),
        },
        include: {
          activities: {
            where: {
              isActive: true,
              ...(methodId ? { procurementMethodId: methodId } : {}),
              ...(status ? { status: status as any } : {}),
              ...(region ? { contracts: { some: { region } } } : {}),
            },
            include: {
              stages: {
                where: { isNotApplicable: false },
                select: { status: true, currentTargetEndDate: true, actualEndDate: true },
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
            },
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const filename = `project_summary_${targetYear ?? 'all'}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Project Procurement Summary', [
    'Project Code & Name',
    'Activities / Packages',
    'Completed',
    'Ongoing',
    'Delayed',
    'Estimated Amount (ETB)',
    'Contracted Amount (ETB)',
    'Final Contract Amount (ETB)',
    'Paid Amount (ETB)',
    'Remaining Balance (ETB)',
    'Current Progress %',
  ]);

  const today = new Date();

  for (const p of projects) {
    const allActivities = p.plans.flatMap((pl) => pl.activities);
    if (allActivities.length === 0) continue;

    const totalCount = allActivities.length;
    const completedCount = allActivities.filter((a) => a.status === 'COMPLETED').length;
    const ongoingCount = allActivities.filter(
      (a) => a.status === 'PLANNED' || a.status === 'IN_PROGRESS',
    ).length;

    const delayedCount = allActivities.filter((a) =>
      a.stages.some((st) => {
        if (st.status === 'COMPLETED' && st.actualEndDate && st.currentTargetEndDate) {
          return st.actualEndDate > st.currentTargetEndDate;
        }
        return st.status !== 'COMPLETED' && st.currentTargetEndDate && st.currentTargetEndDate < today;
      }),
    ).length;

    const totalEstimated = allActivities.reduce(
      (sum, a) => sum + Number(a.estimatedBudget),
      0,
    );

    const allContracts = allActivities.flatMap((a) => a.contracts);
    const contractedTotal = allContracts.reduce(
      (sum, c) => sum + Number(c.contractAmountWithVat || c.totalValue),
      0,
    );
    const finalContractTotal = allContracts
      .filter((c) => c.status === 'COMPLETED')
      .reduce((sum, c) => sum + Number(c.contractAmountWithVat || c.totalValue), 0);

    const totalPaid = allContracts.reduce(
      (sum, c) => sum + c.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
      0,
    );

    const remaining = Math.max(0, contractedTotal - totalPaid);
    const progressPct =
      totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) + '%' : '0.0%';

    sheet.addRow([
      `${p.code} - ${p.name}`,
      totalCount,
      completedCount,
      ongoingCount,
      delayedCount,
      totalEstimated.toFixed(2),
      contractedTotal.toFixed(2),
      finalContractTotal.toFixed(2),
      totalPaid.toFixed(2),
      remaining.toFixed(2),
      progressPct,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #12: Officer Summary (P0) ─────────────────────────────────────────
export async function streamOfficerSummary(
  res: Response,
  query: OfficerSummaryQuery,
): Promise<void> {
  const {
    budgetYear,
    fiscalYear,
    officerId,
    projectId,
    sector,
    region,
    status,
    category,
    methodId,
    page,
    limit,
  } = query;

  const targetYear = budgetYear || fiscalYear;

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(officerId ? { id: officerId } : {}),
      createdPlans: {
        some: {
          isActive: true,
          ...(targetYear ? { budgetYear: targetYear } : {}),
          ...(projectId ? { projectId } : {}),
          ...(category ? { procurementCategory: category } : {}),
        },
      },
    },
    include: {
      createdPlans: {
        where: {
          isActive: true,
          ...(targetYear ? { budgetYear: targetYear } : {}),
          ...(projectId ? { projectId } : {}),
          ...(category ? { procurementCategory: category } : {}),
        },
        include: {
          activities: {
            where: {
              isActive: true,
              ...(methodId ? { procurementMethodId: methodId } : {}),
              ...(status ? { status: status as any } : {}),
              ...(region ? { contracts: { some: { region } } } : {}),
            },
            include: {
              stages: {
                where: { isNotApplicable: false },
                include: { stageType: { select: { label: true } } },
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
            },
          },
        },
      },
    },
    orderBy: { displayName: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `officer_summary_${targetYear ?? 'all'}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Officer Workload Summary', [
    'Responsible Officer',
    'Assigned Activities',
    'Completed',
    'Ongoing',
    'Delayed',
    'Current Active Stages',
    'Estimated Amount (ETB)',
    'Contracted Amount (ETB)',
    'Paid Amount (ETB)',
    'Remaining Balance (ETB)',
    'Delay Measure',
  ]);

  const today = new Date();

  for (const u of users) {
    const activities = u.createdPlans.flatMap((p) => p.activities);
    if (activities.length === 0) continue;

    const totalAssigned = activities.length;
    const completed = activities.filter((a) => a.status === 'COMPLETED').length;
    const ongoing = activities.filter(
      (a) => a.status === 'PLANNED' || a.status === 'IN_PROGRESS',
    ).length;

    let delayed = 0;
    const activeStageSet = new Set<string>();

    for (const a of activities) {
      let isActDelayed = false;
      for (const st of a.stages) {
        if (st.status === 'IN_PROGRESS') {
          activeStageSet.add(st.stageType.label);
        }
        if (st.status === 'COMPLETED' && st.actualEndDate && st.currentTargetEndDate) {
          if (st.actualEndDate > st.currentTargetEndDate) isActDelayed = true;
        } else if (
          st.status !== 'COMPLETED' &&
          st.currentTargetEndDate &&
          st.currentTargetEndDate < today
        ) {
          isActDelayed = true;
        }
      }
      if (isActDelayed) delayed++;
    }

    const estimated = activities.reduce(
      (sum, a) => sum + Number(a.estimatedBudget),
      0,
    );

    const contracts = activities.flatMap((a) => a.contracts);
    const contracted = contracts.reduce(
      (sum, c) => sum + Number(c.contractAmountWithVat || c.totalValue),
      0,
    );

    const paid = contracts.reduce(
      (sum, c) => sum + c.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
      0,
    );

    const balance = Math.max(0, contracted - paid);
    const stageSummary =
      Array.from(activeStageSet).slice(0, 3).join(', ') || 'Various';

    sheet.addRow([
      u.displayName,
      totalAssigned,
      completed,
      ongoing,
      delayed,
      stageSummary,
      estimated.toFixed(2),
      contracted.toFixed(2),
      paid.toFixed(2),
      balance.toFixed(2),
      `${delayed} overdue`,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Legacy Wrappers ──────────────────────────────────────────────────────────
export const streamMonthlySummary = streamMonthlyProcurementReport;
export const streamProjectOfficerSummary = streamOfficerSummary;
