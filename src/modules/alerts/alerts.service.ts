import type { Prisma } from '../../generated/prisma/client.js';
import { PaymentStatus } from '../../generated/prisma/enums.js';
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

    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...(region ? { region } : {}),
    };

    // 1. Fetch contracts with their pending payments
    const contracts = await prisma.contract.findMany({
      where,
      include: {
        payments: {
          where: {
            deletedAt: null,
            status: PaymentStatus.PENDING,
          },
        },
      },
    });

    for (const contract of contracts) {
      const totalVal = Number(contract.totalValue);
      const paidVal = Number(contract.paidAmount);

      // Alert 1: Overdue Pending Payments (payments created more than 30 days ago and still pending)
      for (const payment of contract.payments) {
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
            contractNo: contract.contractNo,
            message: `Payment ref ${payment.referenceNo ?? payment.id} has been pending for ${daysPending} days.`,
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
          contractNo: contract.contractNo,
          message: `Contract ${contract.contractNo} is over 90% paid (${((paidVal / totalVal) * 100).toFixed(1)}%).`,
          createdAt: new Date(),
        });
      }
    }

    return alerts;
  }
}
