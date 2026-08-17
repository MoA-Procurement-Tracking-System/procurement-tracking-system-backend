import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';

export interface AlertItem {
  id: string;
  type: 'OVERDUE_PAYMENT' | 'NEAR_EXPIRY' | 'HIGH_COMPLETION';
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  contractId: string;
  contractNo: string;
  message: string;
  createdAt: Date;
}

export class AlertsService {
  async getAlerts(region?: string): Promise<AlertItem[]> {
    const alerts: AlertItem[] = [];
    const now = new Date();

    const where: Prisma.ContractWhereInput = { isActive: true };

    if (region) {
      where.region = {
        is: {
          OR: [{ id: region }, { code: region }],
          isActive: true,
        },
      };
    }

    // Fetch contracts with their active payments and payment statuses.
    const contracts = await prisma.contract.findMany({
      where,
      include: {
        payments: {
          where: { isActive: true },
          include: { status: { select: { code: true } } },
        },
      },
    });

    for (const contract of contracts) {
      const totalVal = Number(contract.currentAmount);
      const paidVal = contract.payments
        .filter((payment) => payment.status.code === 'PAID')
        .reduce((total, payment) => total + Number(payment.amount), 0);

      // Alert 1: Overdue pending payments (created more than 30 days ago).
      for (const payment of contract.payments) {
        if (payment.status.code !== 'PENDING') continue;

        const daysPending = Math.floor(
          (now.getTime() - new Date(payment.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysPending > 30) {
          alerts.push({
            id: `alert-overdue-${payment.id}`,
            type: 'OVERDUE_PAYMENT',
            severity: 'HIGH',
            contractId: contract.id,
            contractNo: contract.contractNumber,
            message: `Payment ${payment.id} has been pending for ${daysPending} days.`,
            createdAt: payment.createdAt,
          });
        }
      }

      // Alert 2: High Completion (> 90% paid amount)
      if (
        totalVal > 0 &&
        paidVal / totalVal >= 0.9 &&
        paidVal / totalVal < 1.0
      ) {
        alerts.push({
          id: `alert-completion-${contract.id}`,
          type: 'HIGH_COMPLETION',
          severity: 'INFO',
          contractId: contract.id,
          contractNo: contract.contractNumber,
          message: `Contract ${contract.contractNumber} is over 90% paid (${((paidVal / totalVal) * 100).toFixed(1)}%).`,
          createdAt: new Date(),
        });
      }
    }

    return alerts;
  }
}
