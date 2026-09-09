import type { Request, Response, NextFunction } from 'express';
import * as planService from './plan.service.js';
import { ApiError } from '../../utils/errors.js';

export const getPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = req.query.page
      ? parseInt(String(req.query.page), 10)
      : undefined;
    const pageSize = req.query.pageSize
      ? parseInt(String(req.query.pageSize), 10)
      : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;

    const plans = await planService.getPlansService({
      page,
      pageSize,
      search,
      status,
    });
    res.status(200).json(plans);
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plan = await planService.getPlanByIdService(req.params.id as string);
    if (!plan) {
      return next(ApiError.notFound('Plan not found'));
    }
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const plan = await planService.createPlanService(req.body, req.user.id);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const plan = await planService.updatePlanService(
      req.params.id as string,
      req.body,
      req.user.id,
    );
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};

export const requestPlanUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const plan = await planService.requestPlanUpdateService(
      req.params.id as string,
      req.user.id,
    );
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};

export const approvePlanUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const plan = await planService.approvePlanUpdateService(
      req.params.id as string,
      req.user.id,
    );
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};

export const submitPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const plan = await planService.submitPlanService(
      req.params.id as string,
      req.user.id,
    );
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};

export const sendToCommittee = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const voteDeadlineHours =
      typeof req.body.voteDeadlineHours === 'number'
        ? req.body.voteDeadlineHours
        : undefined;
    const plan = await planService.sendToCommitteeService(
      req.params.id as string,
      req.user.id,
      voteDeadlineHours,
    );
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};

export const rejectPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const plan = await planService.rejectPlanService(
      req.params.id as string,
      req.body.reason || 'No reason provided',
      req.user.id,
    );
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};

export const submitCommitteeVote = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    // Voter identity is strictly derived from the authenticated session
    const voterId = req.user.id;
    const plan = await planService.submitCommitteeVoteService(
      req.params.id as string,
      req.body.decision,
      req.body.comment || '',
      voterId,
    );
    res.status(200).json(plan);
  } catch (error) {
    next(error);
  }
};
