import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { DashboardService } from './dashboard.service.js';
import {
  dashboardSummaryQuerySchema,
  dashboardByActivityQuerySchema,
} from './dashboard.schema.js';

const dashboardService = new DashboardService();

export class DashboardController {
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = dashboardSummaryQuerySchema.parse(req.query);
      const summary = await dashboardService.getSummary(validatedQuery.region);
      res.status(200).json(summary);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : 'Error fetching dashboard summary';
      res.status(500).json({ error: message });
    }
  }

  async getByActivity(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = dashboardByActivityQuerySchema.parse(req.query);
      const byActivity = await dashboardService.getByActivity(
        validatedQuery.region,
      );
      res.status(200).json(byActivity);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : 'Error fetching activity metrics';
      res.status(500).json({ error: message });
    }
  }
}

export const dashboardController = new DashboardController();
