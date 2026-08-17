import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';

function contractWhere(region?: string): Prisma.ContractWhereInput {
  const where: Prisma.ContractWhereInput = { isActive: true };

  if (region) {
    where.region = {
      is: { OR: [{ id: region }, { code: region }], isActive: true },
    };
  }

  return where;
}

function paidAmount(
  payments: Array<{ amount: { toString(): string }; status: { code: string } }>,
): number {
  return payments
    .filter((payment) => payment.status.code === 'PAID')
    .reduce((total, payment) => total + Number(payment.amount), 0);
}

export class DashboardService {
  async getSummary(region?: string) {
    const contracts = await prisma.contract.findMany({
      where: contractWhere(region),
      include: {
        payments: { include: { status: { select: { code: true } } } },
        status: { select: { code: true } },
      },
    });

    const totalValue = contracts.reduce(
      (total, contract) => total + Number(contract.currentAmount),
      0,
    );
    const totalPaidAmount = contracts.reduce(
      (total, contract) => total + paidAmount(contract.payments),
      0,
    );

    return {
      totalValue,
      paidAmount: totalPaidAmount,
      remainingValue: totalValue - totalPaidAmount,
      activeContractsCount: contracts.filter(
        (contract) => contract.status.code === 'ACTIVE',
      ).length,
    };
  }

  async getByActivity(region?: string) {
    const contracts = await prisma.contract.findMany({
      where: contractWhere(region),
      include: {
        activity: true,
        payments: { include: { status: { select: { code: true } } } },
      },
    });

    const activities = new Map<
      string,
      { contractCount: number; totalValue: number; paidAmount: number }
    >();

    for (const contract of contracts) {
      const activityId = contract.activity.id;
      const summary = activities.get(activityId) ?? {
        contractCount: 0,
        totalValue: 0,
        paidAmount: 0,
      };
      summary.contractCount += 1;
      summary.totalValue += Number(contract.currentAmount);
      summary.paidAmount += paidAmount(contract.payments);
      activities.set(activityId, summary);
    }

    return [...activities].map(([activityId, summary]) => ({
      activityId,
      ...summary,
      remainingValue: summary.totalValue - summary.paidAmount,
    }));
  }
}
