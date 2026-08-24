import type { Response } from 'express';
import { ActivityStatus } from '../../generated/prisma/enums.js';
import { prisma } from '../../config/database.js';
import {
  createStreamingWorkbook,
  fmtDecimal,
  fmtDate,
} from './excel/workbook.helper.js';
import type {
  DetailedProcurementQuery,
  AnnualPlanQuery,
  ProcurementStepQuery,
  PlanVsActualQuery,
  DelayedProcurementQuery,
  ContractPaymentQuery,
  MonthlySummaryQuery,
  ProjectOfficerSummaryQuery,
} from './reports.schema.js';

export class ReportsService {
  // ─── Report #7: Detailed Procurement ───────────────────────────────────────
  async streamDetailedProcurement(
    res: Response,
    query: DetailedProcurementQuery,
    userId: string,
    isDirector: boolean,
  ): Promise<void> {
    const {
      planId,
      projectId,
      procurementMethodId,
      status,
      budgetYear,
      reviewType,
      page,
      limit,
    } = query;

    const where = {
      ...(isDirector ? {} : { plan: { createdBy: userId } }),
      ...(planId ? { planId } : {}),
      ...(projectId ? { plan: { projectId } } : {}),
      ...(procurementMethodId ? { procurementMethodId } : {}),
      ...(status ? { status: status as ActivityStatus } : {}),
      ...(budgetYear ? { plan: { budgetYear } } : {}),
      ...(reviewType ? { reviewType } : {}),
    };

    const activities = await prisma.activity.findMany({
      where,
      include: {
        procurementMethod: { select: { label: true } },
        plan: {
          select: {
            title: true,
            budgetYear: true,
            procurementCategory: true,
            project: { select: { code: true, name: true } },
            creator: { select: { displayName: true } },
          },
        },
        contracts: {
          where: { deletedAt: null },
          include: { supplier: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
          take: 1, // first/primary contract
        },
        components: { select: { component: true, subcomponent: true } },
        fundings: { select: { fundingSource: true, loanGrantNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const filename = `detailed_procurement_${fmtDate(new Date())}_p${page}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    const sheet = addSheet('Detailed Procurement', [
      'Reference',
      'Project Code',
      'Project Name',
      'Budget Year',
      'Category',
      'Procurement Method',
      'Market Approach',
      'Review Type',
      'Description',
      'Estimated Budget',
      'Currency',
      'Funding Sources',
      'Components',
      'Supplier / Winner',
      'Contract Value',
      'Contract Status',
      'Activity Status',
      'Officer',
      'Created At',
    ]);

    for (const a of activities) {
      const primaryContract = a.contracts[0];
      const fundingSources = a.fundings
        .map((f) =>
          [f.fundingSource, f.loanGrantNumber].filter(Boolean).join(' '),
        )
        .join('; ');
      const components = a.components
        .map((c) => [c.component, c.subcomponent].filter(Boolean).join(' > '))
        .join('; ');

      sheet.addRow([
        a.reference,
        a.plan.project.code,
        a.plan.project.name,
        a.plan.budgetYear ?? '',
        a.plan.procurementCategory ?? '',
        a.procurementMethod.label,
        a.marketApproach ?? '',
        a.reviewType ?? '',
        a.description ?? '',
        fmtDecimal(a.estimatedBudget),
        a.currency ?? '',
        fundingSources,
        components,
        primaryContract?.supplier?.name ?? '',
        primaryContract ? fmtDecimal(primaryContract.totalValue) : '',
        primaryContract?.status ?? '',
        a.status,
        a.plan.creator.displayName,
        fmtDate(a.createdAt),
      ]);
    }

    await (sheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }

  // ─── Report #1: Annual Procurement Plan ────────────────────────────────────
  async streamAnnualProcurementPlan(
    res: Response,
    query: AnnualPlanQuery,
    userId: string,
    isDirector: boolean,
  ): Promise<void> {
    const { budgetYear, projectId, status, page, limit } = query;

    const plans = await prisma.plan.findMany({
      where: {
        budgetYear,
        isActive: true,
        ...(isDirector ? {} : { createdBy: userId }),
        ...(projectId ? { projectId } : {}),
        ...(status
          ? {
              status:
                status as import('../../generated/prisma/client.js').PlanStatus,
            }
          : {}),
      },
      include: {
        project: { select: { code: true, name: true } },
        creator: { select: { displayName: true } },
        approvedByUser: { select: { displayName: true } },
        activities: {
          include: {
            procurementMethod: { select: { label: true } },
            components: { select: { component: true, subcomponent: true } },
            fundings: { select: { fundingSource: true } },
            stages: { orderBy: { sequence: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const filename = `annual_procurement_plan_${budgetYear}_p${page}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    // Sheet 1: Summary (one row per Plan)
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

    // Sheet 2: Activity Detail (one row per Activity)
    const detailSheet = addSheet('Activity Detail', [
      'Reference',
      'Plan Title',
      'Project Code',
      'Project Name',
      'Category',
      'Procurement Method',
      'Description',
      'Estimated Budget',
      'Currency',
      'Components',
      'Funding Sources',
      '1st Stage Planned Start',
      'Last Stage Planned End',
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
        const components = a.components
          .map((c) => [c.component, c.subcomponent].filter(Boolean).join(' > '))
          .join('; ');
        const fundings = a.fundings.map((f) => f.fundingSource).join('; ');

        detailSheet.addRow([
          a.reference,
          plan.title,
          plan.project.code,
          plan.project.name,
          plan.procurementCategory ?? '',
          a.procurementMethod.label,
          a.description ?? '',
          fmtDecimal(a.estimatedBudget),
          a.currency ?? '',
          components,
          fundings,
          fmtDate(firstStage?.plannedStartDate),
          fmtDate(lastStage?.plannedEndDate),
        ]);
      }
    }

    await (summarySheet as unknown as { commit: () => Promise<void> }).commit();
    await (detailSheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }

  // ─── Report #3: Procurement Step ───────────────────────────────────────────
  async streamProcurementSteps(
    res: Response,
    query: ProcurementStepQuery,
  ): Promise<void> {
    const { activityId } = query;

    const activity = await prisma.activity.findUniqueOrThrow({
      where: { id: activityId },
      include: { procurementMethod: { select: { label: true } } },
    });

    const [stages, templates] = await Promise.all([
      prisma.stage.findMany({
        where: { activityId },
        include: {
          stageType: { select: { label: true } },
          revisions: { orderBy: { revisionNo: 'asc' } },
        },
        orderBy: { sequence: 'asc' },
      }),
      prisma.stageTemplate.findMany({
        where: {
          procurementMethodId: activity.procurementMethodId,
          isRequired: true,
        },
        include: { stageType: { select: { label: true } } },
        orderBy: { sequence: 'asc' },
      }),
    ]);

    // Build a set of stage type IDs that are present
    const presentTypeIds = new Set(stages.map((s) => s.stageTypeId));

    const filename = `procurement_steps_${activityId.slice(0, 8)}_${fmtDate(new Date())}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    const sheet = addSheet('Procurement Steps', [
      'Seq',
      'Stage Name',
      'Required',
      'Status',
      'Planned Start',
      'Planned End',
      'Current Target Start',
      'Current Target End',
      'Actual Start',
      'Actual End',
      'Times Revised',
      'Remarks',
    ]);

    for (const s of stages) {
      const isRequired = templates.some((t) => t.stageTypeId === s.stageTypeId);
      sheet.addRow([
        s.sequence,
        s.stageType.label,
        isRequired ? 'Yes' : 'No',
        s.isNotApplicable ? 'N/A' : s.status,
        fmtDate(s.plannedStartDate),
        fmtDate(s.plannedEndDate),
        fmtDate(s.currentTargetStartDate),
        fmtDate(s.currentTargetEndDate),
        fmtDate(s.actualStartDate),
        fmtDate(s.actualEndDate),
        s.revisions.length,
        s.remarks ?? '',
      ]);
    }

    // Add rows for required stages that are missing entirely
    for (const t of templates) {
      if (!presentTypeIds.has(t.stageTypeId)) {
        sheet.addRow([
          t.sequence,
          t.stageType.label,
          'Yes',
          'NOT CREATED',
          '',
          '',
          '',
          '',
          '',
          '',
          0,
          '',
        ]);
      }
    }

    await (sheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }

  // ─── Report #2: Plan vs Actual ─────────────────────────────────────────────
  async streamPlanVsActual(
    res: Response,
    query: PlanVsActualQuery,
    userId: string,
    isDirector: boolean,
  ): Promise<void> {
    const { planId, projectId, budgetYear, page, limit } = query;

    const stages = await prisma.stage.findMany({
      where: {
        activity: {
          plan: {
            ...(isDirector ? {} : { createdBy: userId }),
            ...(planId ? { id: planId } : {}),
            ...(projectId ? { projectId } : {}),
            ...(budgetYear ? { budgetYear } : {}),
          },
        },
        isNotApplicable: false,
      },
      include: {
        stageType: { select: { label: true } },
        activity: {
          select: {
            reference: true,
            plan: {
              select: {
                title: true,
                project: { select: { code: true } },
              },
            },
          },
        },
      },
      orderBy: [{ activityId: 'asc' }, { sequence: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    const filename = `plan_vs_actual_${fmtDate(new Date())}_p${page}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    const sheet = addSheet('Plan vs Actual', [
      'Project Code',
      'Plan Title',
      'Activity Reference',
      'Stage Name',
      'Planned End (Baseline)',
      'Current Target End',
      'Actual End',
      'Baseline Slippage (days)',
      'Operational Delay (days)',
      'Status',
    ]);

    for (const s of stages) {
      const baselineSlippage =
        s.actualEndDate && s.plannedEndDate
          ? Math.round(
              (s.actualEndDate.getTime() - s.plannedEndDate.getTime()) /
                86_400_000,
            )
          : '';
      const operationalDelay =
        s.actualEndDate && s.currentTargetEndDate
          ? Math.round(
              (s.actualEndDate.getTime() - s.currentTargetEndDate.getTime()) /
                86_400_000,
            )
          : '';

      sheet.addRow([
        s.activity.plan.project.code,
        s.activity.plan.title,
        s.activity.reference,
        s.stageType.label,
        fmtDate(s.plannedEndDate),
        fmtDate(s.currentTargetEndDate),
        fmtDate(s.actualEndDate),
        baselineSlippage,
        operationalDelay,
        s.status,
      ]);
    }

    await (sheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }

  // ─── Report #4: Delayed Procurement ────────────────────────────────────────
  async streamDelayedProcurement(
    res: Response,
    query: DelayedProcurementQuery,
    userId: string,
    isDirector: boolean,
  ): Promise<void> {
    const { projectId, planId, budgetYear, page, limit } = query;
    const today = new Date();

    const planFilter = {
      ...(isDirector ? {} : { createdBy: userId }),
      ...(planId ? { id: planId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(budgetYear ? { budgetYear } : {}),
    };

    // Part A: open stages past their current target end date
    const overdueOpen = await prisma.stage.findMany({
      where: {
        isNotApplicable: false,
        status: { notIn: ['COMPLETED' as const] },
        currentTargetEndDate: { lt: today },
        activity: { plan: planFilter },
      },
      include: {
        stageType: { select: { label: true } },
        revisions: { select: { id: true } },
        activity: {
          select: {
            reference: true,
            plan: {
              select: {
                title: true,
                project: { select: { code: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { currentTargetEndDate: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Part B: completed stages where actualEndDate > currentTargetEndDate
    const completedLate = await prisma.$queryRaw<
      Array<{
        id: string;
        activityId: string;
        stageTypeLabel: string;
        activityReference: string;
        planTitle: string;
        projectCode: string;
        projectName: string;
        plannedEndDate: Date | null;
        currentTargetEndDate: Date | null;
        actualEndDate: Date | null;
        revisionCount: number;
        status: string;
      }>
    >`
      SELECT
        s.id,
        s."activityId",
        lv.label         AS "stageTypeLabel",
        a.reference      AS "activityReference",
        pl.title         AS "planTitle",
        pr.code          AS "projectCode",
        pr.name          AS "projectName",
        s."plannedEndDate",
        s."currentTargetEndDate",
        s."actualEndDate",
        s.status,
        (SELECT COUNT(*) FROM "StageRevision" sr WHERE sr."stageId" = s.id)::int AS "revisionCount"
      FROM "Stage" s
      JOIN "LookupValue" lv ON lv.id = s."stageTypeId"
      JOIN "Activity" a    ON a.id  = s."activityId"
      JOIN "Plan" pl       ON pl.id = a."planId"
      JOIN "Project" pr    ON pr.id = pl."projectId"
      WHERE s."actualEndDate" IS NOT NULL
        AND s."actualEndDate" > s."currentTargetEndDate"
        AND s."isNotApplicable" = false
        ${!isDirector ? prisma.$queryRaw`AND pl."createdBy" = ${userId}` : prisma.$queryRaw``}
        ${planId ? prisma.$queryRaw`AND pl.id = ${planId}` : prisma.$queryRaw``}
        ${projectId ? prisma.$queryRaw`AND pr.id = ${projectId}` : prisma.$queryRaw``}
        ${budgetYear ? prisma.$queryRaw`AND pl."budgetYear" = ${budgetYear}` : prisma.$queryRaw``}
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `;

    const filename = `delayed_procurement_${fmtDate(new Date())}_p${page}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    const sheet = addSheet('Delayed Procurement', [
      'Project Code',
      'Project Name',
      'Plan Title',
      'Activity Reference',
      'Stage Name',
      'Status',
      'Current Target End',
      'Actual End',
      'Operational Delay (days)',
      'Baseline Slippage (days)',
      'Times Revised',
      'Flag',
    ]);

    for (const s of overdueOpen) {
      const opDelay = s.currentTargetEndDate
        ? Math.round(
            (today.getTime() - s.currentTargetEndDate.getTime()) / 86_400_000,
          )
        : '';
      const baseSlippage = s.plannedEndDate
        ? Math.round(
            (today.getTime() - s.plannedEndDate.getTime()) / 86_400_000,
          )
        : '';

      sheet.addRow([
        s.activity.plan.project.code,
        s.activity.plan.project.name,
        s.activity.plan.title,
        s.activity.reference,
        s.stageType.label,
        s.status,
        fmtDate(s.currentTargetEndDate),
        '',
        opDelay,
        baseSlippage,
        s.revisions.length,
        'OVERDUE',
      ]);
    }

    for (const s of completedLate) {
      const opDelay =
        s.actualEndDate && s.currentTargetEndDate
          ? Math.round(
              (s.actualEndDate.getTime() - s.currentTargetEndDate.getTime()) /
                86_400_000,
            )
          : '';
      const baseSlippage =
        s.actualEndDate && s.plannedEndDate
          ? Math.round(
              (s.actualEndDate.getTime() - s.plannedEndDate.getTime()) /
                86_400_000,
            )
          : '';

      sheet.addRow([
        s.projectCode,
        s.projectName,
        s.planTitle,
        s.activityReference,
        s.stageTypeLabel,
        s.status,
        fmtDate(s.currentTargetEndDate),
        fmtDate(s.actualEndDate),
        opDelay,
        baseSlippage,
        s.revisionCount,
        'COMPLETED LATE',
      ]);
    }

    await (sheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }

  // ─── Report #6: Contract & Payment ─────────────────────────────────────────
  async streamContractPayment(
    res: Response,
    query: ContractPaymentQuery,
  ): Promise<void> {
    const { region, supplierId, status, projectId, page, limit } = query;

    const contracts = await prisma.contract.findMany({
      where: {
        deletedAt: null,
        ...(region ? { region } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(status
          ? {
              status:
                status as import('../../generated/prisma/client.js').ContractStatus,
            }
          : {}),
        ...(projectId ? { activity: { plan: { projectId } } } : {}),
      },
      include: {
        supplier: { select: { name: true } },
        activity: {
          select: {
            reference: true,
            description: true,
          },
        },
        payments: {
          where: { deletedAt: null },
          select: { amount: true, paymentType: true, status: true },
        },
        amendments: {
          orderBy: { amendmentNo: 'asc' },
          select: { newValue: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const filename = `contract_payment_${fmtDate(new Date())}_p${page}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    const sheet = addSheet('Contract & Payment', [
      'Supplier / Contractor',
      'Activity',
      'Region',
      'Contract Amount with VAT',
      'Amendment',
      'Total with 15%VAT',
      'Total Contract Net of VAT',
      'Total Paid',
      'Advance',
      '1st Payment',
      '2nd Payment',
      'Final Payment',
      'Retention Withholding',
      'Retention Payment',
      'Remaining Balance',
      'Subcomponent',
    ]);

    for (const c of contracts) {
      // Sum amendment amounts (last amendment = final value change)
      const lastAmendment = c.amendments[c.amendments.length - 1];
      const amendmentTotal = lastAmendment
        ? Number(lastAmendment.newValue) - Number(c.totalValue)
        : 0;

      // Pivot payments by type (sum per type, paid only)
      const byType = (type: string) =>
        c.payments
          .filter((p) => p.paymentType === type && p.status === 'PAID')
          .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalPaid = c.payments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const contractWithVat = c.contractAmountWithVat
        ? Number(c.contractAmountWithVat)
        : Number(c.totalValue) * (1 + (c.vatRate ?? 0) / 100);

      const remaining = contractWithVat - totalPaid;

      sheet.addRow([
        c.supplier.name,
        c.activity?.description ?? c.activity?.reference ?? '',
        c.region ?? '',
        fmtDecimal(c.totalValue),
        amendmentTotal !== 0 ? amendmentTotal.toFixed(2) : '',
        contractWithVat.toFixed(2),
        c.contractNetOfVat ? fmtDecimal(c.contractNetOfVat) : '',
        totalPaid.toFixed(2),
        byType('ADVANCE') > 0 ? byType('ADVANCE').toFixed(2) : '',
        byType('INTERIM_1') > 0 ? byType('INTERIM_1').toFixed(2) : '',
        byType('INTERIM_2') > 0 ? byType('INTERIM_2').toFixed(2) : '',
        byType('FINAL') > 0 ? byType('FINAL').toFixed(2) : '',
        byType('RETENTION_WITHHOLDING') > 0
          ? byType('RETENTION_WITHHOLDING').toFixed(2)
          : '',
        byType('RETENTION_PAYMENT') > 0
          ? byType('RETENTION_PAYMENT').toFixed(2)
          : '',
        remaining.toFixed(2),
        c.subcomponent ?? '',
      ]);
    }

    await (sheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }

  // ─── Report #5: Monthly Summary ─────────────────────────────────────────────
  async streamMonthlySummary(
    res: Response,
    query: MonthlySummaryQuery,
  ): Promise<void> {
    const { year, dateBasis } = query;

    type MonthRow = {
      month: Date;
      contract_count: number;
      total_value: string | number;
      paid_amount: string | number;
    };

    let rows: MonthRow[];

    if (dateBasis === 'awarded') {
      rows = await prisma.$queryRaw<MonthRow[]>`
        SELECT
          DATE_TRUNC('month', c."createdAt")   AS month,
          COUNT(*)::int                         AS contract_count,
          COALESCE(SUM(c."totalValue"), 0)      AS total_value,
          COALESCE(SUM(c."paidAmount"), 0)      AS paid_amount
        FROM "Contract" c
        WHERE EXTRACT(YEAR FROM c."createdAt") = ${year}
          AND c."deletedAt" IS NULL
        GROUP BY 1
        ORDER BY 1
      `;
    } else if (dateBasis === 'planned') {
      rows = await prisma.$queryRaw<MonthRow[]>`
        SELECT
          DATE_TRUNC('month', a."createdAt")    AS month,
          COUNT(*)::int                         AS contract_count,
          COALESCE(SUM(a."estimatedBudget"), 0) AS total_value,
          0                                     AS paid_amount
        FROM "Activity" a
        WHERE EXTRACT(YEAR FROM a."createdAt") = ${year}
        GROUP BY 1
        ORDER BY 1
      `;
    } else {
      // completed — group by last actual stage completion date
      rows = await prisma.$queryRaw<MonthRow[]>`
        SELECT
          DATE_TRUNC('month', s."actualEndDate")  AS month,
          COUNT(DISTINCT s."activityId")::int      AS contract_count,
          0                                        AS total_value,
          0                                        AS paid_amount
        FROM "Stage" s
        WHERE s."actualEndDate" IS NOT NULL
          AND s.status = 'COMPLETED'
          AND EXTRACT(YEAR FROM s."actualEndDate") = ${year}
        GROUP BY 1
        ORDER BY 1
      `;
    }

    const filename = `monthly_summary_${year}_${dateBasis}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    const sheet = addSheet('Monthly Summary', [
      'Month',
      '# Contracts / Activities',
      'Total Value',
      'Total Paid',
      'Remaining',
    ]);

    for (const row of rows) {
      const totalValue = Number(row.total_value);
      const paidAmount = Number(row.paid_amount);
      const monthLabel = new Date(row.month).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      sheet.addRow([
        monthLabel,
        row.contract_count,
        totalValue.toFixed(2),
        paidAmount.toFixed(2),
        (totalValue - paidAmount).toFixed(2),
      ]);
    }

    await (sheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }

  // ─── Report #8: Project & Officer Summary ───────────────────────────────────
  async streamProjectOfficerSummary(
    res: Response,
    query: ProjectOfficerSummaryQuery,
  ): Promise<void> {
    const { budgetYear, projectId, page, limit } = query;

    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
        ...(budgetYear ? { budgetYear } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: {
        creator: { select: { id: true, displayName: true } },
        project: { select: { code: true, name: true } },
        activities: {
          include: {
            stages: {
              where: { isNotApplicable: false },
              select: {
                status: true,
                actualEndDate: true,
                currentTargetEndDate: true,
              },
            },
            contracts: {
              where: { deletedAt: null },
              select: { totalValue: true },
            },
          },
        },
      },
      orderBy: [{ createdBy: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    const filename = `project_officer_summary_${fmtDate(new Date())}_p${page}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    const sheet = addSheet('Project & Officer Summary', [
      'Officer Name',
      'Project Code',
      'Project Name',
      'Budget Year',
      '# Plans',
      '# Activities',
      'Total Estimated Budget',
      '# Contracts Awarded',
      'Total Contract Value',
      'Completed Stages On-Time %',
      'Delayed Stages Count',
    ]);

    // Group plans by officer + project
    type GroupKey = string;
    const groups = new Map<GroupKey, typeof plans>();
    for (const plan of plans) {
      const key = `${plan.createdBy}::${plan.projectId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(plan);
    }

    for (const groupPlans of groups.values()) {
      const first = groupPlans[0]!;
      const allActivities = groupPlans.flatMap((p) => p.activities);
      const allStages = allActivities.flatMap((a) => a.stages);
      const completedStages = allStages.filter((s) => s.status === 'COMPLETED');
      const onTimeCount = completedStages.filter(
        (s) =>
          s.actualEndDate &&
          s.currentTargetEndDate &&
          s.actualEndDate <= s.currentTargetEndDate,
      ).length;
      const delayedCount = completedStages.length - onTimeCount;
      const onTimePct =
        completedStages.length > 0
          ? ((onTimeCount / completedStages.length) * 100).toFixed(1) + '%'
          : 'N/A';

      const totalEstBudget = allActivities.reduce(
        (s, a) => s + Number(a.estimatedBudget),
        0,
      );
      const allContracts = allActivities.flatMap((a) => a.contracts);
      const totalContractValue = allContracts.reduce(
        (s, c) => s + Number(c.totalValue),
        0,
      );

      const budgetYears = [
        ...new Set(groupPlans.map((p) => p.budgetYear).filter(Boolean)),
      ].join(', ');

      sheet.addRow([
        first.creator.displayName,
        first.project.code,
        first.project.name,
        budgetYears,
        groupPlans.length,
        allActivities.length,
        totalEstBudget.toFixed(2),
        allContracts.length,
        totalContractValue.toFixed(2),
        onTimePct,
        delayedCount,
      ]);
    }

    await (sheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }
}
