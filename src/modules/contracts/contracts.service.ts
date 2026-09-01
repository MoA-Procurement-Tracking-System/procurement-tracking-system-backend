import {
  Prisma,
  ContractStatus,
  PaymentStatus,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import type {
  CreateContractDto,
  CreatePaymentDto,
  UpdateContractDto,
} from './contracts.schema.js';
import { createAuditLog } from '../../shared/audit/audit-logger.js';

export class ContractsService {
  async getContracts(search?: string, status?: string) {
    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
    };

    if (
      status &&
      Object.values(ContractStatus).includes(status as ContractStatus)
    ) {
      where.status = status as ContractStatus;
    }

    if (search) {
      where.OR = [
        { contractNo: { contains: search, mode: 'insensitive' } },
        { sector: { contains: search, mode: 'insensitive' } },
      ];
    }

    return await prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContract(data: CreateContractDto, userId?: string) {
    const contract = await prisma.contract.create({
      data: {
        contractNo: data.contractNo,
        totalValue: data.totalValue,
        remainingValue: data.totalValue,
        paidAmount: 0,
        currency: data.currency ?? 'ETB',
        ...(data.supplierId ? { supplierId: data.supplierId } : {}),
        ...(data.region ? { region: data.region } : {}),
        ...(data.sector ? { sector: data.sector } : {}),
      },
    });

    await createAuditLog({
      userId,
      action: 'CONTRACT_CREATED',
      entityType: 'CONTRACT',
      entityId: contract.id,
      changes: {
        contractNo: contract.contractNo,
        totalValue: Number(contract.totalValue),
        currency: contract.currency,
        region: contract.region,
        sector: contract.sector,
      },
    });

    return contract;
  }

  async recordPayment(
    contractId: string,
    data: CreatePaymentDto,
    userId?: string,
  ) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const contract = await tx.contract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      const currentPaidAmount = Number(contract.paidAmount);
      const limit = Number(
        contract.contractAmountWithVat || contract.totalValue,
      );

      const updatedPaidAmount = currentPaidAmount + data.amount;
      const updatedRemainingValue = limit - updatedPaidAmount;

      if (updatedPaidAmount > limit) {
        throw new Error(
          `Total paid amount (${updatedPaidAmount}) would exceed the contract limit (${limit}).`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          contractId,
          amount: data.amount,
          referenceNo: data.referenceNo,
          idempotencyKey: data.idempotencyKey,
          paymentDate: data.paymentDate ?? new Date(),
        },
      });

      await tx.contract.update({
        where: { id: contractId },
        data: {
          paidAmount: updatedPaidAmount,
          remainingValue: updatedRemainingValue,
        },
      });

      await createAuditLog(
        {
          userId,
          action: 'PAYMENT_ADDED',
          entityType: 'PAYMENT',
          entityId: payment.id,
          changes: {
            contractNo: contract.contractNo,
            amount: data.amount,
            currency: contract.currency,
            referenceNo: data.referenceNo,
            previousPaidAmount: currentPaidAmount,
            newPaidAmount: updatedPaidAmount,
            remainingBalance: updatedRemainingValue,
          },
        },
        tx,
      );

      return payment;
    });
  }

  async getContractById(id: string) {
    return await prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        supplier: true,
        payments: true,
      },
    });
  }

  async updateContract(id: string, data: UpdateContractDto, userId?: string) {
    const { isDeleted, ...updateData } = data;

    const oldContract = await prisma.contract.findUnique({ where: { id } });

    const formattedData: Prisma.ContractUpdateInput = {};

    if (updateData.contractNo !== undefined)
      formattedData.contractNo = updateData.contractNo;
    if (updateData.totalValue !== undefined)
      formattedData.totalValue = updateData.totalValue;
    if (updateData.currency !== undefined)
      formattedData.currency = updateData.currency;
    if (updateData.supplierId !== undefined)
      formattedData.supplier = { connect: { id: updateData.supplierId } };
    if (updateData.region !== undefined)
      formattedData.region = updateData.region;
    if (updateData.sector !== undefined)
      formattedData.sector = updateData.sector;
    if (isDeleted === true) formattedData.deletedAt = new Date();

    const updated = await prisma.contract.update({
      where: { id },
      data: formattedData,
    });

    await createAuditLog({
      userId,
      action: 'CONTRACT_UPDATED',
      entityType: 'CONTRACT',
      entityId: id,
      changes: {
        contractNo: updated.contractNo,
        previousTotalValue: oldContract
          ? Number(oldContract.totalValue)
          : undefined,
        newTotalValue: Number(updated.totalValue),
        currency: updated.currency,
      },
    });

    return updated;
  }

  async getContractPayments(id: string, status?: string) {
    const where: Prisma.PaymentWhereInput = {
      contractId: id,
    };

    if (
      status &&
      Object.values(PaymentStatus).includes(status as PaymentStatus)
    ) {
      where.status = status as PaymentStatus;
    }

    return await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
