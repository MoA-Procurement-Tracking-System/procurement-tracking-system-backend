import { describe, expect, it } from 'vitest';
import {
  createPlanSchema,
  rejectPlanSchema,
  committeeVoteSchema,
} from './plan.schema.js';
import { VoteDecision } from '../../generated/prisma/index.js';

describe('Plan Zod Validation Schemas', () => {
  it('validates a correct create plan payload', () => {
    const validData = {
      projectId: 'proj-123',
      title: 'FY2026 Seed Procurement',
      budgetYear: '2026',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
    };

    const parsed = createPlanSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe('FY2026 Seed Procurement');
      expect(parsed.data.periodStart).toBeInstanceOf(Date);
    }
  });

  it('rejects create plan payload when title or projectId is missing', () => {
    const invalidData = {
      projectId: '',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
    };

    const parsed = createPlanSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('validates plan rejection payload', () => {
    const valid = rejectPlanSchema.safeParse({
      reason: 'Insufficient budget justification',
    });
    expect(valid.success).toBe(true);

    const invalid = rejectPlanSchema.safeParse({ reason: '' });
    expect(invalid.success).toBe(false);
  });

  it('validates committee vote decision enum', () => {
    const approveVote = committeeVoteSchema.safeParse({
      decision: VoteDecision.APPROVE,
      comment: 'Meets technical specification',
    });
    expect(approveVote.success).toBe(true);

    const rejectVote = committeeVoteSchema.safeParse({
      decision: VoteDecision.REJECT,
      comment: 'Over budget',
    });
    expect(rejectVote.success).toBe(true);

    const invalidVote = committeeVoteSchema.safeParse({
      decision: 'MAYBE',
    });
    expect(invalidVote.success).toBe(false);
  });
});

describe('Committee Voting Decision Rules', () => {
  const evaluateVotes = (votes: { decision: VoteDecision }[]) => {
    const approveCount = votes.filter(
      (v) => v.decision === VoteDecision.APPROVE,
    ).length;
    const rejectCount = votes.filter(
      (v) => v.decision === VoteDecision.REJECT,
    ).length;

    if (approveCount >= 3) return 'APPROVED';
    if (rejectCount >= 3) return 'REJECTED';
    return 'WITH_COMMITTEE';
  };

  it('transitions to APPROVED when at least 3 members approve', () => {
    const votes = [
      { decision: VoteDecision.APPROVE },
      { decision: VoteDecision.APPROVE },
      { decision: VoteDecision.APPROVE },
      { decision: VoteDecision.REJECT },
    ];
    expect(evaluateVotes(votes)).toBe('APPROVED');
  });

  it('transitions to REJECTED when at least 3 members reject', () => {
    const votes = [
      { decision: VoteDecision.REJECT },
      { decision: VoteDecision.REJECT },
      { decision: VoteDecision.REJECT },
      { decision: VoteDecision.APPROVE },
    ];
    expect(evaluateVotes(votes)).toBe('REJECTED');
  });

  it('remains WITH_COMMITTEE when fewer than 3 votes are recorded on either side', () => {
    const votes = [
      { decision: VoteDecision.APPROVE },
      { decision: VoteDecision.APPROVE },
      { decision: VoteDecision.REJECT },
    ];
    expect(evaluateVotes(votes)).toBe('WITH_COMMITTEE');
  });
});
