import type { Response } from 'express';
import type {
  ContractStatus,
  PaymentStatus,
} from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/database.js';
import { excelService } from '../../excel/excel.service.js';
import type {
  ContractRegisterQuery,
  ContractPaymentQuery,
  SupplierPerformanceQuery,
} from '../reports.schema.js';

const { createStreamingWorkbook, fmtDecimal, fmtDate } = excelService;

// ─── Report #8: Contract Register (P0) ────────────────────────────────────────
export async function streamContractRegister(
  res: Response,
  query: ContractRegisterQuery,
): Promise<void> {
  const {
    projectId,
    sector,
    region,
    supplierId,
    officerId,
    currency,
    contractStatus,
    methodId,
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
      ...(currency ? { currency } : {}),
      ...(contractStatus ? { status: contractStatus as ContractStatus } : {}),
      activity: {
        ...(methodId ? { procurementMethodId: methodId } : {}),
        plan: {
          ...(projectId ? { projectId } : {}),
          ...(officerId ? { createdBy: officerId } : {}),
          project: {
            ...(fundingSourceId ? { fundingSourceId } : {}),
            ...(sector ? { sector: { label: sector } } : {}),
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
        include: {
          procurementMethod: { select: { label: true } },
          fundings: { select: { fundingSource: true } },
          plan: {
            select: {
              title: true,
              project: {
                select: {
                  code: true,
                  name: true,
                  fundingSource: { select: { label: true } },
                },
              },
            },
          },
        },
      },
      payments: {
        where: { deletedAt: null },
        select: { amount: true, status: true },
      },
      amendments: {
        orderBy: { amendmentNo: 'asc' },
        select: { previousValue: true, newValue: true, reason: true },
      },
    },
    orderBy: { contractNo: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `contract_register_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Contract Register', [
    'Contract Number',
    'Activity Reference',
    'Activity Description',
    'Project',
    'Supplier / Contractor / Consultant',
    'Region',
    'Procurement Method',
    'Financing Source',
    'Currency',
    'Original Contract Amount',
    'Variation / Amendment Amount',
    'Price Adjustment Amount',
    'Current Contract Amount',
    'Final Contract Amount',
    'Award Date',
    'Signature Date',
    'Start Date',
    'Original Completion Date',
    'Revised Completion Date',
    'Actual Completion Date',
    'Contract Status',
    'Total Paid',
    'Remaining Balance',
    'Remarks',
  ]);

  for (const c of contracts) {
    const totalPaid = c.payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const lastAmendment = c.amendments[c.amendments.length - 1];
    const amendmentDiff = lastAmendment
      ? Number(lastAmendment.newValue) - Number(c.totalValue)
      : 0;

    const currentAmount = lastAmendment
      ? Number(lastAmendment.newValue)
      : c.contractAmountWithVat
        ? Number(c.contractAmountWithVat)
        : Number(c.totalValue) * (1 + (c.vatRate ?? 0) / 100);

    const priceAdj = c.priceAdjustmentAmount
      ? Number(c.priceAdjustmentAmount)
      : 0;
    const effectiveAmount = currentAmount + priceAdj;
    const remaining = Math.max(0, effectiveAmount - totalPaid);

    const fundingSource =
      c.activity?.fundings && c.activity.fundings.length > 0
        ? c.activity.fundings.map((f) => f.fundingSource).join(', ')
        : c.activity?.plan?.project?.fundingSource?.label || '';

    sheet.addRow([
      c.contractNo,
      c.activity?.reference ?? '',
      c.activity?.description ?? '',
      c.activity?.plan?.project
        ? `${c.activity.plan.project.code} - ${c.activity.plan.project.name}`
        : '',
      c.supplier.name,
      c.region ?? 'National',
      c.activity?.procurementMethod?.label ?? '',
      fundingSource,
      c.currency,
      fmtDecimal(c.totalValue),
      amendmentDiff !== 0 ? amendmentDiff.toFixed(2) : '0.00',
      priceAdj !== 0 ? priceAdj.toFixed(2) : '0.00',
      effectiveAmount.toFixed(2),
      c.actualCompletionDate ? effectiveAmount.toFixed(2) : '',
      fmtDate(c.awardDate),
      fmtDate(c.signatureDate),
      fmtDate(c.startDate),
      fmtDate(c.plannedEndDate),
      fmtDate(c.revisedCompletionDate),
      fmtDate(c.actualCompletionDate),
      c.status,
      totalPaid.toFixed(2),
      remaining.toFixed(2),
      c.remarks ?? '',
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #9: Contract & Payment Status Report (P0) ─────────────────────────
export async function streamContractPayment(
  res: Response,
  query: ContractPaymentQuery,
): Promise<void> {
  const {
    projectId,
    planId,
    activityId,
    supplierId,
    region,
    sector,
    officerId,
    contractStatus,
    paymentStatus,
    fundingSourceId,
    currency,
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
      ...(currency ? { currency } : {}),
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
            ...(sector ? { sector: { label: sector } } : {}),
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
              project: { select: { code: true, name: true } },
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
        select: { previousValue: true, newValue: true },
      },
    },
    orderBy: { contractNo: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `contract_payment_status_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Contract & Payment Status', [
    'Contract Number',
    'Activity',
    'Project',
    'Supplier / Contractor',
    'Region',
    'Currency',
    'Original Contract Amount',
    'Amendment / Variation',
    'Current / Final Contract Amount',
    'Advance',
    '1st / Interim Payment',
    '2nd / Interim Payment',
    'Final Payment',
    'Retention Payment',
    'Retention Withholding',
    'Other Payments',
    'Total Paid',
    'Remaining Balance',
    'Payment %',
    'Contract Status',
  ]);

  for (const c of contracts) {
    const lastAmendment = c.amendments[c.amendments.length - 1];
    const amendmentDiff = lastAmendment
      ? Number(lastAmendment.newValue) - Number(c.totalValue)
      : 0;

    const byType = (type: string) =>
      c.payments
        .filter((p) => p.paymentType === type && p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPaid = c.payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const currentAmount = lastAmendment
      ? Number(lastAmendment.newValue)
      : c.contractAmountWithVat
        ? Number(c.contractAmountWithVat)
        : Number(c.totalValue) * (1 + (c.vatRate ?? 0) / 100);

    const remaining = Math.max(0, currentAmount - totalPaid);
    const paymentPct =
      currentAmount > 0
        ? ((totalPaid / currentAmount) * 100).toFixed(1) + '%'
        : '0.0%';

    sheet.addRow([
      c.contractNo,
      c.activity?.reference
        ? `${c.activity.reference} - ${c.activity.description ?? ''}`
        : '',
      c.activity?.plan?.project
        ? `${c.activity.plan.project.code} - ${c.activity.plan.project.name}`
        : '',
      c.supplier.name,
      c.region ?? 'National',
      c.currency,
      fmtDecimal(c.totalValue),
      amendmentDiff !== 0 ? amendmentDiff.toFixed(2) : '0.00',
      currentAmount.toFixed(2),
      byType('ADVANCE').toFixed(2),
      byType('INTERIM_1').toFixed(2),
      byType('INTERIM_2').toFixed(2),
      byType('FINAL').toFixed(2),
      byType('RETENTION_PAYMENT').toFixed(2),
      byType('RETENTION_WITHHOLDING').toFixed(2),
      byType('OTHER').toFixed(2),
      totalPaid.toFixed(2),
      remaining.toFixed(2),
      paymentPct,
      c.status,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}

// ─── Report #14: Supplier Performance (P1) ────────────────────────────────────
export async function streamSupplierPerformance(
  res: Response,
  query: SupplierPerformanceQuery,
): Promise<void> {
  const {
    supplierId,
    region,
    sector,
    contractStatus,
    currency,
    dateFrom,
    dateTo,
    page,
    limit,
  } = query;

  const suppliers = await prisma.supplier.findMany({
    where: {
      deletedAt: null,
      ...(supplierId ? { id: supplierId } : {}),
      contracts: {
        some: {
          deletedAt: null,
          ...(region ? { region } : {}),
          ...(currency ? { currency } : {}),
          ...(contractStatus
            ? { status: contractStatus as ContractStatus }
            : {}),
          ...(sector ? { sector } : {}),
          ...(dateFrom || dateTo
            ? {
                createdAt: {
                  ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { lte: new Date(dateTo) } : {}),
                },
              }
            : {}),
        },
      },
    },
    include: {
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
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const filename = `supplier_performance_${fmtDate(new Date())}_p${page}.xlsx`;
  const { addSheet, finalize } = createStreamingWorkbook(res, filename);

  const sheet = addSheet('Supplier Performance', [
    'Supplier / Contractor Name',
    'TIN Number',
    'Total Contracts Awarded',
    'Active Contracts',
    'Completed (On-Time)',
    'Completed (Delayed)',
    'Total Award Value (ETB)',
    'Total Paid Amount (ETB)',
    'Remaining Balance (ETB)',
    'Delivery Compliance %',
    'Status',
  ]);

  for (const s of suppliers) {
    const totalContracts = s.contracts.length;
    const activeContracts = s.contracts.filter(
      (c) => c.status === 'ACTIVE' || c.status === 'SIGNED',
    ).length;

    let onTimeCount = 0;
    let delayedCount = 0;

    for (const c of s.contracts) {
      if (
        c.status === 'COMPLETED' &&
        c.actualCompletionDate &&
        c.plannedEndDate
      ) {
        if (c.actualCompletionDate <= c.plannedEndDate) {
          onTimeCount++;
        } else {
          delayedCount++;
        }
      }
    }

    const totalAward = s.contracts.reduce(
      (sum, c) => sum + Number(c.contractAmountWithVat || c.totalValue),
      0,
    );

    const totalPaid = s.contracts.reduce(
      (sum, c) =>
        sum + c.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
      0,
    );

    const balance = Math.max(0, totalAward - totalPaid);
    const completedTotal = onTimeCount + delayedCount;
    const compliancePct =
      completedTotal > 0
        ? ((onTimeCount / completedTotal) * 100).toFixed(1) + '%'
        : totalContracts > 0
          ? 'In Progress'
          : 'N/A';

    sheet.addRow([
      s.name,
      s.tinNumber,
      totalContracts,
      activeContracts,
      onTimeCount,
      delayedCount,
      totalAward.toFixed(2),
      totalPaid.toFixed(2),
      balance.toFixed(2),
      compliancePct,
      s.status,
    ]);
  }

  await (sheet as unknown as { commit: () => Promise<void> }).commit();
  await finalize();
}
