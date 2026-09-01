interface AuditLogPayload {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  user?: {
    name: string | null;
    displayName?: string | null;
    email: string | null;
  } | null;
}

/**
 * Formats raw audit log entries into human-readable sentences
 * explaining WHO did WHAT data or financial change, and WHY.
 */
export function formatAuditSummary(log: AuditLogPayload): string {
  const userName =
    log.user?.displayName ||
    log.user?.name ||
    log.user?.email ||
    'System / Anonymous';
  const changes = (log.changes ?? {}) as Record<string, unknown>;

  switch (log.action) {
    case 'PAYMENT_ADDED': {
      const amount = changes.amount
        ? Number(changes.amount).toLocaleString()
        : 'N/A';
      const currency = String(changes.currency ?? 'ETB');
      const contractNo = String(changes.contractNo ?? log.entityId ?? '');
      const ref = changes.referenceNo ? ` (Ref: ${changes.referenceNo})` : '';
      return `${userName} recorded a payment of ${amount} ${currency} for Contract ${contractNo}${ref}`;
    }

    case 'CONTRACT_CREATED': {
      const totalVal = changes.totalValue
        ? Number(changes.totalValue).toLocaleString()
        : 'N/A';
      const currency = String(changes.currency ?? 'ETB');
      const contractNo = String(changes.contractNo ?? log.entityId ?? '');
      return `${userName} created Contract ${contractNo} valued at ${totalVal} ${currency}`;
    }

    case 'CONTRACT_UPDATED': {
      const contractNo = String(changes.contractNo ?? log.entityId ?? '');
      if (changes.newTotalValue) {
        const newVal = Number(changes.newTotalValue).toLocaleString();
        const oldVal = changes.previousTotalValue
          ? Number(changes.previousTotalValue).toLocaleString()
          : 'N/A';
        return `${userName} updated Contract ${contractNo} total value from ${oldVal} to ${newVal} ${changes.currency ?? 'ETB'}`;
      }
      return `${userName} updated contract details for Contract ${contractNo}`;
    }

    case 'ACTIVITY_CREATED': {
      const ref = String(changes.reference ?? log.entityId ?? '');
      const budget = changes.estimatedBudget
        ? Number(changes.estimatedBudget).toLocaleString()
        : 'N/A';
      return `${userName} created Procurement Activity ${ref} with estimated budget ${budget} ${changes.currency ?? 'USD'}`;
    }

    case 'ACTIVITY_UPDATED': {
      const ref = String(changes.reference ?? log.entityId ?? '');
      if (changes.newEstimatedBudget !== undefined) {
        const newB = Number(changes.newEstimatedBudget).toLocaleString();
        const oldB = changes.previousEstimatedBudget
          ? Number(changes.previousEstimatedBudget).toLocaleString()
          : 'N/A';
        return `${userName} updated Activity ${ref} estimated budget from ${oldB} to ${newB} ${changes.currency ?? 'USD'}`;
      }
      return `${userName} updated details for Activity ${ref}`;
    }

    case 'PLAN_SUBMITTED':
      return `${userName} submitted procurement plan for review`;

    case 'PLAN_SENT_TO_COMMITTEE':
      return `${userName} forwarded procurement plan to Endorsement Committee`;

    case 'PLAN_APPROVED':
      return `${userName} approved procurement plan`;

    case 'PLAN_REJECTED': {
      const reason = changes.reason ? `: "${changes.reason}"` : '';
      return `${userName} rejected procurement plan${reason}`;
    }

    case 'LOGIN':
      return `${userName} logged in successfully`;

    case 'LOGIN_FAILED':
      return `Failed login attempt for ${log.entityId || userName}`;

    case 'LOGOUT':
      return `${userName} logged out`;

    case 'PASSWORD_CHANGE':
      return `${userName} changed their password`;

    case 'USER_INVITATION_SENT':
      return `${userName} sent an account invitation email to ${changes.email || log.entityId}`;

    default: {
      const actionText = log.action.replace(/_/g, ' ').toLowerCase();
      const target = log.entityType ? ` on ${log.entityType}` : '';
      return `${userName} performed ${actionText}${target}`;
    }
  }
}
