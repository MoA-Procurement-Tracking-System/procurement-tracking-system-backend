import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AlertsService } from './alerts.service.js';
import { alertsQuerySchema } from './alerts.schema.js';

const alertsService = new AlertsService();

export class AlertsController {
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = alertsQuerySchema.parse(req.query);
      const alerts = await alertsService.getAlerts(validatedQuery.region);
      res.status(200).json(alerts);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message = error instanceof Error ? error.message : 'Error fetching alerts';
      res.status(500).json({ error: message });
    }
  }
}

export const alertsController = new AlertsController();