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
    // ─── Contracts & Financials ───
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

    case 'CONTRACT_AMENDED': {
      const contractNo = String(changes.contractNo ?? log.entityId ?? '');
      const amendNo = changes.amendmentNo ? ` #${changes.amendmentNo}` : '';
      const reason = changes.reason ? `: "${changes.reason}"` : '';
      return `${userName} issued Amendment${amendNo} for Contract ${contractNo}${reason}`;
    }

    case 'CONTRACT_DELETED': {
      const contractNo = String(changes.contractNo ?? log.entityId ?? '');
      return `${userName} deleted Contract ${contractNo}`;
    }

    // ─── Procurement Activities & Stages ───
    case 'ACTIVITY_CREATED': {
      const ref = String(changes.reference ?? log.entityId ?? '');
      const budget = changes.estimatedBudget
        ? Number(changes.estimatedBudget).toLocaleString()
        : 'N/A';
      return `${userName} created Procurement Activity ${ref} with estimated budget ${budget} ${changes.currency ?? 'ETB'}`;
    }

    case 'ACTIVITY_UPDATED': {
      const ref = String(changes.reference ?? log.entityId ?? '');
      if (changes.newEstimatedBudget !== undefined) {
        const newB = Number(changes.newEstimatedBudget).toLocaleString();
        const oldB = changes.previousEstimatedBudget
          ? Number(changes.previousEstimatedBudget).toLocaleString()
          : 'N/A';
        return `${userName} updated Activity ${ref} estimated budget from ${oldB} to ${newB} ${changes.currency ?? 'ETB'}`;
      }
      return `${userName} updated details for Activity ${ref}`;
    }

    case 'STAGE_REPLANNED': {
      const stageName = String(changes.stageName ?? 'Stage');
      const actRef = changes.activityRef ? ` in ${changes.activityRef}` : '';
      const reason = changes.reason ? ` (Reason: "${changes.reason}")` : '';
      return `${userName} replanned stage "${stageName}"${actRef}${reason}`;
    }

    case 'STAGE_UPDATED': {
      const stageName = String(changes.stageName ?? 'Stage');
      const actRef = changes.activityRef ? ` in ${changes.activityRef}` : '';
      return `${userName} updated dates/status for stage "${stageName}"${actRef}`;
    }

    // ─── Procurement Plans & Governance ───
    case 'PLAN_CREATED': {
      const title = String(changes.title ?? log.entityId ?? 'Procurement Plan');
      return `${userName} created Procurement Plan "${title}"`;
    }

    case 'PLAN_SUBMITTED': {
      const title = String(changes.title ?? log.entityId ?? 'Procurement Plan');
      return `${userName} submitted Procurement Plan "${title}" for director review`;
    }

    case 'PLAN_SENT_TO_COMMITTEE': {
      const title = String(changes.title ?? log.entityId ?? 'Procurement Plan');
      return `${userName} forwarded Procurement Plan "${title}" to Endorsement Committee`;
    }

    case 'PLAN_RETURNED_FOR_REVISION': {
      const title = String(changes.title ?? log.entityId ?? 'Procurement Plan');
      const reason =
        changes.reason || changes.comment
          ? `: "${changes.reason || changes.comment}"`
          : '';
      return `${userName} returned Procurement Plan "${title}" for revision${reason}`;
    }

    case 'PLAN_ENDORSED': {
      const title = String(changes.title ?? log.entityId ?? 'Procurement Plan');
      return `${userName} recorded Endorsement Committee approval for Plan "${title}"`;
    }

    case 'PLAN_APPROVED': {
      const title = String(changes.title ?? log.entityId ?? 'Procurement Plan');
      return `${userName} authorized & approved Procurement Plan "${title}"`;
    }

    case 'PLAN_REJECTED': {
      const title = String(changes.title ?? log.entityId ?? 'Procurement Plan');
      const reason =
        changes.reason || changes.comment
          ? `: "${changes.reason || changes.comment}"`
          : '';
      return `${userName} rejected Procurement Plan "${title}"${reason}`;
    }

    case 'COMMITTEE_VOTE_CAST': {
      const title = String(changes.title ?? log.entityId ?? 'Procurement Plan');
      const dec = String(changes.decision ?? '');
      return `${userName} voted ${dec} on Procurement Plan "${title}"`;
    }

    // ─── Projects ───
    case 'PROJECT_CREATED': {
      const proj = String(
        changes.code ?? changes.name ?? log.entityId ?? 'Project',
      );
      return `${userName} created Project "${proj}"`;
    }

    case 'PROJECT_UPDATED': {
      const proj = String(
        changes.code ?? changes.name ?? log.entityId ?? 'Project',
      );
      return `${userName} updated Project details for "${proj}"`;
    }

    // ─── User Governance & Access ───
    case 'USER_INVITED': {
      const target = String(changes.email ?? log.entityId ?? 'user');
      const role = changes.role ? ` (${changes.role})` : '';
      return `${userName} sent an account invitation email to ${target}${role}`;
    }

    case 'USER_ROLE_CHANGED': {
      const target = String(
        changes.name ?? changes.email ?? log.entityId ?? 'User',
      );
      return `${userName} changed role of ${target} from ${changes.previousRole ?? 'previous'} to ${changes.newRole}`;
    }

    case 'USER_DEACTIVATED': {
      const target = String(
        changes.name ?? changes.email ?? log.entityId ?? 'User',
      );
      return `${userName} deactivated access for user ${target}`;
    }

    case 'USER_ACTIVATED': {
      const target = String(
        changes.name ?? changes.email ?? log.entityId ?? 'User',
      );
      return `${userName} restored/activated access for user ${target}`;
    }

    case 'USER_DELETED': {
      const target = String(
        changes.name ?? changes.email ?? log.entityId ?? 'User',
      );
      return `${userName} deleted user account for ${target}`;
    }

    case 'USER_CREATED': {
      const target = String(
        changes.name ?? changes.email ?? log.entityId ?? 'User',
      );
      const role = changes.role ? ` as ${changes.role}` : '';
      return `${userName} created user account for ${target}${role}`;
    }

    case 'USER_UPDATED': {
      const target = String(
        changes.name ?? changes.email ?? log.entityId ?? 'User',
      );
      return `${userName} updated profile details for ${target}`;
    }

    case 'USER_INVITATION_CANCELLED': {
      const target = String(changes.email ?? log.entityId ?? 'User');
      return `${userName} cancelled pending invitation for ${target}`;
    }

    // ─── Authentication & Identity ───
    case 'LOGIN':
    case 'LOGIN_SUCCEEDED':
      return `${userName} signed in successfully`;

    case 'LOGIN_FAILED': {
      const target = String(changes.email ?? log.entityId ?? userName);
      return `Failed sign-in attempt for ${target}`;
    }

    case 'LOGOUT':
      return `${userName} signed out`;

    case 'ACCOUNT_ACTIVATED':
      return `${userName} activated their account and set initial password`;

    case 'PASSWORD_CHANGE':
    case 'PASSWORD_CHANGED':
      return `${userName} changed their password`;

    case 'PASSWORD_RESET_REQUESTED': {
      const target = String(changes.email ?? userName);
      return `Password reset requested for ${target}`;
    }

    case 'PASSWORD_RESET_COMPLETED':
      return `${userName} completed password reset`;

    default: {
      const actionText = log.action.replace(/_/g, ' ').toLowerCase();
      const target = log.entityType ? ` on ${log.entityType}` : '';
      return `${userName} performed ${actionText}${target}`;
    }
  }
}
