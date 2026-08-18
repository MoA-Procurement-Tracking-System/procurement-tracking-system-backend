import type { Request, Response, NextFunction } from 'express';
import * as activityService from './activity.service.js';
import {
  createActivitySchema,
  updateActivitySchema,
  updateStageSchema,
  updateStageActualSchema,
  replanStageSchema,
} from './activity.schema.js';

// ─── Activities ───────────────────────────────────────────────────────────────

export const getActivities = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const activities = await activityService.getActivitiesService(
      typeof req.query.planId === 'string' ? req.query.planId : undefined,
    );
    res.status(200).json(activities);
  } catch (e) {
    next(e);
  }
};

export const getActivityById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const activity = await activityService.getActivityByIdService(
      req.params.id as string,
    );
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.status(200).json(activity);
  } catch (e) {
    next(e);
  }
};

export const createActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid input',
      });
    }
    const activity = await activityService.createActivityService(
      parsed.data,
      req.auth!.user.id,
    );
    res.status(201).json(activity);
  } catch (e) {
    next(e);
  }
};

export const updateActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = updateActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid input',
      });
    }
    const activity = await activityService.updateActivityService(
      req.params.id as string,
      parsed.data,
      req.auth!.user.id,
    );
    res.status(200).json(activity);
  } catch (e) {
    next(e);
  }
};

// ─── Stage: Update Planning Dates ─────────────────────────────────────────────

export const updateStage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = updateStageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid stage data',
      });
    }
    const stage = await activityService.updateStageService(
      req.params.stageId as string,
      parsed.data,
    );
    res.status(200).json(stage);
  } catch (e) {
    next(e);
  }
};

// ─── Stage: Record Actual Date ─────────────────────────────────────────────────

export const updateStageActual = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = updateStageActualSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid stage data',
      });
    }
    const stage = await activityService.updateStageActualService(
      req.params.stageId as string,
      parsed.data,
    );
    res.status(200).json(stage);
  } catch (e) {
    next(e);
  }
};

// ─── Stage: Replan ─────────────────────────────────────────────────────────────

export const replanStage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = replanStageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid replan data',
      });
    }
    const stage = await activityService.replanStageService(
      req.params.stageId as string,
      parsed.data,
      req.auth!.user.id,
    );
    res.status(200).json(stage);
  } catch (e) {
    next(e);
  }
};
