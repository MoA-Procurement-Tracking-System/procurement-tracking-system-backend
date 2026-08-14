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

  async getBySector(region?: string) {
    const contracts = await prisma.contract.findMany({
      where: contractWhere(region),
      include: {
        activity: { include: { sector: { select: { label: true } } } },
        payments: { include: { status: { select: { code: true } } } },
      },
    });

    const sectors = new Map<
      string,
      { contractCount: number; totalValue: number; paidAmount: number }
    >();

    for (const contract of contracts) {
      const sector = contract.activity.sector.label;
      const summary = sectors.get(sector) ?? {
        contractCount: 0,
        totalValue: 0,
        paidAmount: 0,
      };
      summary.contractCount += 1;
      summary.totalValue += Number(contract.currentAmount);
      summary.paidAmount += paidAmount(contract.payments);
      sectors.set(sector, summary);
    }

    return [...sectors].map(([sector, summary]) => ({
      sector,
      ...summary,
      remainingValue: summary.totalValue - summary.paidAmount,
    }));
  }
}
