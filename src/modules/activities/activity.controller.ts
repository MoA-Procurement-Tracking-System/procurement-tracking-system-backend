import type { Request, Response } from 'express';
import * as activityService from './activity.service.js';

export const getActivities = async (req: Request, res: Response) => {
  try {
    const activities = await activityService.getActivitiesService(
      req.query.planId as string,
    );
    res.status(200).json(activities);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getActivityById = async (req: Request, res: Response) => {
  try {
    const activity = await activityService.getActivityByIdService(
      req.params.id as string,
    );
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.status(200).json(activity);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const createActivity = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const { planId, lots, ...activityData } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }
    const activity = await activityService.createActivityService(
      planId,
      activityData,
      lots || [],
      req.user?.id || 'test-user-id',
    );
    res.status(201).json(activity);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const updateActivity = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const activity = await activityService.updateActivityService(
      req.params.id as string,
      req.body,
      req.user?.id || 'test-user-id',
    );
    res.status(200).json(activity);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
