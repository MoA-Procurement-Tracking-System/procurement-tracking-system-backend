import type { Request, Response } from 'express';
import * as planService from './plan.service.js';

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await planService.getPlansService();
    res.status(200).json(plans);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getPlanById = async (req: Request, res: Response) => {
  try {
    const plan = await planService.getPlanByIdService(req.params.id as string);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const createPlan = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const plan = await planService.createPlanService(
      req.body,
      req.user?.id || 'test-user-id',
    );
    res.status(201).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const updatePlan = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const plan = await planService.updatePlanService(
      req.params.id as string,
      req.body,
      req.user?.id || 'test-user-id',
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const requestPlanUpdate = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const plan = await planService.requestPlanUpdateService(
      req.params.id as string,
      req.user?.id || 'test-user-id',
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const approvePlanUpdate = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const plan = await planService.approvePlanUpdateService(
      req.params.id as string,
      req.user?.id || 'test-user-id',
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const submitPlan = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const plan = await planService.submitPlanService(
      req.params.id as string,
      req.user?.id || 'test-user-id',
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const sendToCommittee = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const voteDeadlineHours =
      typeof req.body.voteDeadlineHours === 'number'
        ? req.body.voteDeadlineHours
        : undefined;
    const plan = await planService.sendToCommitteeService(
      req.params.id as string,
      req.user?.id || 'test-user-id',
      voteDeadlineHours,
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const rejectPlan = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const plan = await planService.rejectPlanService(
      req.params.id as string,
      req.body.reason || 'No reason provided',
      req.user?.id || 'test-user-id',
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const submitCommitteeVote = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const voterIdOrEmail =
      req.body.voterUserId ||
      req.body.voterEmail ||
      req.body.memberId ||
      req.user?.id ||
      '';
    const plan = await planService.submitCommitteeVoteService(
      req.params.id as string,
      req.body.decision,
      req.body.comment || '',
      voterIdOrEmail,
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const submitManagementDecision = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const userId = req.body.userId || req.body.email || req.user?.id || '';
    const plan = await planService.managementDecisionService(
      req.params.id as string,
      req.body.decision,
      req.body.comment,
      userId,
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const returnPlanForRevision = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const userId = req.body.userId || req.user?.id || '';
    const plan = await planService.returnPlanForRevisionService(
      req.params.id as string,
      req.body.comment || '',
      userId,
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getPlanComments = async (req: Request, res: Response) => {
  try {
    const comments = await planService.getPlanCommentsService(
      req.params.id as string,
    );
    res.status(200).json(comments);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const addComment = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const userId = req.body.userId || req.user?.id || '';
    const comment = await planService.addCommentService(
      req.body.entityType,
      req.body.entityId,
      req.body.body,
      userId,
    );
    res.status(201).json(comment);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
