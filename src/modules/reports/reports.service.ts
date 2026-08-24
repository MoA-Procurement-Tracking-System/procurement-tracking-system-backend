import type { Response } from 'express';
import type {
  ActivityStatus,
  PlanStatus,
  ContractStatus,
  StageStatus,
  PaymentStatus,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { excelService } from '../excel/excel.service.js';

const { createStreamingWorkbook, fmtDecimal, fmtDate } = excelService;

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
              primaryContract.contractAmountWithVat ||
                primaryContract.totalValue,
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

  // ─── Report #1: Annual Procurement Plan ────────────────────────────────────
  async streamAnnualProcurementPlan(
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

        // Format Date ranges: Min Planned Start to Max Planned End
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

  // ─── Report #3: Procurement STEP Report ─────────────────────────────────────
  async streamProcurementSteps(
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

      if (
        s.status === 'COMPLETED' &&
        s.actualEndDate &&
        s.currentTargetEndDate
      ) {
        const diff =
          s.actualEndDate.getTime() - s.currentTargetEndDate.getTime();
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

  // ─── Report #2: Plan vs Actual ─────────────────────────────────────────────
  async streamPlanVsActual(
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

    // Filter by performance status in application memory (due to complex datetime differences)
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

    // Paginate in memory after filter
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
      if (
        s.status === 'COMPLETED' &&
        s.actualEndDate &&
        s.currentTargetEndDate
      ) {
        const diff =
          s.actualEndDate.getTime() - s.currentTargetEndDate.getTime();
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

  // ─── Report #4: Delayed Procurement ────────────────────────────────────────
  async streamDelayedProcurement(
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

    // Stage level filter
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

    // Query both open overdue and completed late stages
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

    // Compute delay days and apply advanced filters in memory
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
        if (minDelayDays !== undefined && delayDays < minDelayDays)
          return false;

        if (delayBucket) {
          if (delayBucket === '1-7') return delayDays >= 1 && delayDays <= 7;
          if (delayBucket === '8-30') return delayDays >= 8 && delayDays <= 30;
          if (delayBucket === '31-60')
            return delayDays >= 31 && delayDays <= 60;
          if (delayBucket === '60+') return delayDays >= 60;
        }

        return true;
      });

    // Paginate
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

  // ─── Report #6: Contract & Payment ─────────────────────────────────────────
  async streamContractPayment(
    res: Response,
    query: ContractPaymentQuery,
  ): Promise<void> {
    const {
      projectId,
      planId,
      activityId,
      supplierId,
      region,
      officerId,
      contractStatus,
      paymentStatus,
      fundingSourceId,
      minAmount,
      maxAmount,
      dateFrom,
      dateTo,
      page,
      limit,
    } = query;

    const contracts = await prisma.contract.findMany({
      where: {
        deletedAt: null,
        ...(region ? { region } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(contractStatus ? { status: contractStatus as ContractStatus } : {}),
        ...(paymentStatus
          ? { payments: { some: { status: paymentStatus as PaymentStatus } } }
          : {}),
        ...(activityId ? { activityId } : {}),
        activity: {
          plan: {
            ...(planId ? { id: planId } : {}),
            ...(projectId ? { projectId } : {}),
            ...(officerId ? { createdBy: officerId } : {}),
            project: {
              ...(fundingSourceId ? { fundingSourceId } : {}),
            },
          },
        },
        ...(minAmount || maxAmount
          ? {
              totalValue: {
                ...(minAmount !== undefined ? { gte: minAmount } : {}),
                ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
              },
            }
          : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      },
      include: {
        supplier: { select: { name: true } },
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
      'Project',
      'Activity',
      'Supplier',
      'Region',
      'Contract Number',
      'Contract Award Date',
      'Contract Signature Date',
      'Start Date',
      'End Date',
      'Original Contract Amount',
      'Amendment',
      'Final Contract Amount',
      'Total Paid',
      'Remaining Balance',
      'Contract Status',
      'Advance',
      '1st Payment',
      '2nd Payment',
      'Final Payment',
      'Retention Payment',
      'Retention Withholding',
    ]);

    for (const c of contracts) {
      const lastAmendment = c.amendments[c.amendments.length - 1];
      const amendmentTotal = lastAmendment
        ? Number(lastAmendment.newValue) - Number(c.totalValue)
        : 0;

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
        c.activity?.plan?.project?.name ?? '',
        c.activity?.description ?? c.activity?.reference ?? '',
        c.supplier.name,
        c.region ?? '',
        c.contractNo,
        fmtDate(c.awardDate),
        fmtDate(c.signatureDate),
        fmtDate(c.startDate),
        fmtDate(c.plannedEndDate),
        fmtDecimal(c.totalValue),
        amendmentTotal !== 0 ? amendmentTotal.toFixed(2) : '',
        contractWithVat.toFixed(2),
        totalPaid.toFixed(2),
        remaining.toFixed(2),
        c.status,
        byType('ADVANCE') > 0 ? byType('ADVANCE').toFixed(2) : '',
        byType('INTERIM_1') > 0 ? byType('INTERIM_1').toFixed(2) : '',
        byType('INTERIM_2') > 0 ? byType('INTERIM_2').toFixed(2) : '',
        byType('FINAL') > 0 ? byType('FINAL').toFixed(2) : '',
        byType('RETENTION_PAYMENT') > 0
          ? byType('RETENTION_PAYMENT').toFixed(2)
          : '',
        byType('RETENTION_WITHHOLDING') > 0
          ? byType('RETENTION_WITHHOLDING').toFixed(2)
          : '',
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

    // Retrieve all activities for the year matching filters
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

    // Apply optional quarter filter
    let filtered = activities;
    if (quarter) {
      const qStart = (quarter - 1) * 3; // 0, 3, 6, 9
      const qEnd = qStart + 2; // 2, 5, 8, 11
      filtered = activities.filter((a) => {
        const m = a.createdAt.getMonth();
        return m >= qStart && m <= qEnd;
      });
    }

    const filename = `monthly_summary_${year}${quarter ? '_Q' + quarter : ''}.xlsx`;
    const { addSheet, finalize } = createStreamingWorkbook(res, filename);

    // Calculate Dashboard KPIs
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

    // 1. Dashboard KPIs Sheet
    const kpiSheet = addSheet('Dashboard KPIs', ['Metric', 'Value']);
    kpiSheet.addRow(['Total Activities', filtered.length]);
    kpiSheet.addRow(['Total Planned Value (ETB)', totalPlanned.toFixed(2)]);
    kpiSheet.addRow([
      'Total Contract Value (ETB)',
      totalContractVal.toFixed(2),
    ]);
    kpiSheet.addRow(['Total Paid (ETB)', totalPaid.toFixed(2)]);
    kpiSheet.addRow(['Remaining Balance (ETB)', remaining.toFixed(2)]);
    kpiSheet.addRow(['Completed Stages', completedCount]);
    kpiSheet.addRow(['Ongoing Stages', ongoingCount]);
    kpiSheet.addRow(['Delayed Stages', delayedCount]);

    // 2. Category & Method Sheet
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

    // 3. Funding Source (Treasury/Loan/Grant) Sheet
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

    // 4. Monthly Summary Sheet
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
    await (
      catMethodSheet as unknown as { commit: () => Promise<void> }
    ).commit();
    await (fundingSheet as unknown as { commit: () => Promise<void> }).commit();
    await (monthlySheet as unknown as { commit: () => Promise<void> }).commit();
    await finalize();
  }

  // ─── Report #8: Project & Officer Summary ───────────────────────────────────
  async streamProjectOfficerSummary(
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

    // Paginate groups in memory
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
        const paid = c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        return s + paid;
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
}
