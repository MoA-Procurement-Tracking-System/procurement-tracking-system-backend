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

export class ReportsService {
  async generateContractsCsv(region?: string): Promise<string> {
    const contracts = await prisma.contract.findMany({
      where: contractWhere(region),
      include: {
        supplier: { select: { name: true } },
        currency: { select: { code: true } },
        region: { select: { code: true } },
        status: { select: { code: true } },
        activity: { include: { sector: { select: { label: true } } } },
        payments: { include: { status: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Contract ID',
      'Contract No',
      'Supplier Name',
      'Total Value',
      'Paid Amount',
      'Remaining Value',
      'Currency',
      'Region',
      'Sector',
      'Status',
      'Created At',
    ];

    const rows = contracts.map((contract) => {
      const totalValue = Number(contract.currentAmount);
      const paidAmount = contract.payments
        .filter((payment) => payment.status.code === 'PAID')
        .reduce((total, payment) => total + Number(payment.amount), 0);
      const values = [
        contract.id,
        contract.contractNumber,
        contract.supplier.name,
        totalValue,
        paidAmount,
        totalValue - paidAmount,
        contract.currency.code,
        contract.region?.code ?? '',
        contract.activity.sector.label,
        contract.status.code,
        contract.createdAt.toISOString(),
      ];

      return values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
