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

  async createContract(data: CreateContractDto) {
    return await prisma.contract.create({
      data: {
        contractNo: data.contractNo,
        totalValue: data.totalValue,
        remainingValue: data.totalValue,
        paidAmount: 0,
        currency: data.currency ?? 'ETB',
        // Conditionally include supplierId only if provided
        ...(data.supplierId ? { supplierId: data.supplierId } : {}),
        // Conditionally include optional nullable string fields
        ...(data.region ? { region: data.region } : {}),
        ...(data.sector ? { sector: data.sector } : {}),
      },
    });
  }

  async recordPayment(contractId: string, data: CreatePaymentDto) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const contract = await tx.contract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        throw new Error('Contract not found');
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

      const currentPaidAmount = Number(contract.paidAmount);
      const currentTotalValue = Number(contract.totalValue);

      const updatedPaidAmount = currentPaidAmount + data.amount;
      const updatedRemainingValue = currentTotalValue - updatedPaidAmount;

      await tx.contract.update({
        where: { id: contractId },
        data: {
          paidAmount: updatedPaidAmount,
          remainingValue: updatedRemainingValue,
        },
      });

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

  async updateContract(id: string, data: UpdateContractDto) {
    const { isDeleted, ...updateData } = data;

    // Build data object without keys that evaluate to undefined
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

    return await prisma.contract.update({
      where: { id },
      data: formattedData,
    });
  }

  async getContractPayments(id: string, status?: string) {
    // Define where using Prisma's PaymentWhereInput type
    const where: Prisma.PaymentWhereInput = {
      contractId: id,
    };

    // Safely check and cast status to the enum type
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
