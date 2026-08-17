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
    const plan = await planService.sendToCommitteeService(
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
    const plan = await planService.submitCommitteeVoteService(
      req.params.id as string,
      req.body.decision,
      req.body.comment || '',
      req.user?.id || 'test-user-id',
    );
    res.status(200).json(plan);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
