import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';

export class ReportsService {
  async generateContractsCsv(region?: string): Promise<string> {
    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...(region ? { region } : {}),
    };

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        supplier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Define CSV headers
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

    // Format rows escaping commas and quotes
    const rows = contracts.map((c) => {
      const supplierName = c.supplier?.name ?? 'N/A';
      return [
        `"${c.id}"`,
        `"${c.contractNo ?? c.contractNumber ?? ''}"`,
        `"${supplierName.replace(/"/g, '""')}"`,
        `"${c.totalValue ?? c.currentAmount ?? ''}"`,
        `"${c.paidAmount ?? 0}"`,
        `"${c.remainingValue ?? ''}"`,
        `"${c.currency ?? 'ETB'}"`,
        `"${c.region ?? ''}"`,
        `"${c.sector ?? ''}"`,
        `"${c.status}"`,
        `"${c.createdAt.toISOString()}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
