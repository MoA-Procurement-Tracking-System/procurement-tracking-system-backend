import { Prisma } from '../../generated/prisma/index.js';
import { ContractStatus } from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';

export class DashboardService {
  async getSummary(region?: string) {
    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...(region ? { region } : {}),
    };

    const aggregate = await prisma.contract.aggregate({
      _sum: {
        totalValue: true,
        paidAmount: true,
        remainingValue: true,
      },
      where,
    });

    const activeContractsCount = await prisma.contract.count({
      where: {
        ...where,
        status: ContractStatus.ACTIVE,
      },
    });

    return {
      totalValue: aggregate._sum.totalValue ?? 0,
      paidAmount: aggregate._sum.paidAmount ?? 0,
      remainingValue: aggregate._sum.remainingValue ?? 0,
      activeContractsCount,
    };
  }

  async getBySector(region?: string) {
    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...(region ? { region } : {}),
    };

    const grouped = await prisma.contract.groupBy({
      by: ['sector'],
      _sum: {
        totalValue: true,
        paidAmount: true,
        remainingValue: true,
      },
      _count: {
        id: true,
      },
      where,
    });

    return grouped.map((item) => ({
      sector: item.sector ?? 'Unassigned',
      contractCount: item._count.id,
      totalValue: item._sum.totalValue ?? 0,
      paidAmount: item._sum.paidAmount ?? 0,
      remainingValue: item._sum.remainingValue ?? 0,
    }));
  }
}
