import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';
import type {
  CreateContractDto,
  CreatePaymentDto,
  UpdateContractDto,
} from './contracts.schema.js';
export class ContractsService {
  async getContracts(search?: string, status?: string) {
    const where: Prisma.ContractWhereInput = { isActive: true };

    if (status && status) {
      where.status = { is: { code: status, isActive: true } };
    }

    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        {
          activity: {
            is: {
              sector: {
                is: { label: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        },
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
        contractNumber: data.contractNumber,
        activityId: data.activityId,
        supplierId: data.supplierId,
        originalAmount: data.originalAmount,
        currentAmount: data.currentAmount,
        currencyId: data.currencyId,
        statusId: data.statusId,
        ...(data.regionId !== undefined ? { regionId: data.regionId } : {}),
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
          typeId: data.typeId,
          statusId: data.statusId,
          idempotencyKey: data.idempotencyKey,
          ...(data.requestDate !== undefined
            ? { requestDate: data.requestDate }
            : {}),
          ...(data.paymentDate !== undefined
            ? { paymentDate: data.paymentDate }
            : {}),
        },
      });

      return payment;
    });
  }

  async getContractById(id: string) {
    return await prisma.contract.findFirst({
      where: {
        id,
        isActive: true,
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

    if (updateData.contractNumber !== undefined)
      formattedData.contractNumber = updateData.contractNumber;
    if (updateData.activityId !== undefined)
      formattedData.activity = { connect: { id: updateData.activityId } };
    if (updateData.originalAmount !== undefined)
      formattedData.originalAmount = updateData.originalAmount;
    if (updateData.currentAmount !== undefined)
      formattedData.currentAmount = updateData.currentAmount;
    if (updateData.currencyId !== undefined)
      formattedData.currency = { connect: { id: updateData.currencyId } };
    if (updateData.supplierId !== undefined)
      formattedData.supplier = { connect: { id: updateData.supplierId } };
    if (updateData.regionId !== undefined)
      formattedData.region = updateData.regionId
        ? { connect: { id: updateData.regionId } }
        : { disconnect: true };
    if (updateData.statusId !== undefined)
      formattedData.status = { connect: { id: updateData.statusId } };
    if (isDeleted === true) formattedData.isActive = false;

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

    if (status) where.status = { is: { code: status, isActive: true } };

    return await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
