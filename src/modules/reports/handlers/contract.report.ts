import type { Response } from 'express';
import type {
  ContractStatus,
  PaymentStatus,
} from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/database.js';
import { excelService } from '../../excel/excel.service.js';
import type { ContractPaymentQuery } from '../reports.schema.js';

const { createStreamingWorkbook, fmtDecimal, fmtDate } = excelService;

// ─── Report #6: Contract & Payment ────────────────────────────────────────────
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
