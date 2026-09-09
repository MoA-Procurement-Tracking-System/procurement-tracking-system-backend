import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { alertsService } from './alerts.service.js';
import {
  alertsQuerySchema,
  createAlertSchema,
  updateAlertSchema,
} from './alerts.schema.js';

export class AlertsController {
  /**
   * CREATE: POST /api/alerts
   */
  async createAlert(req: Request, res: Response): Promise<void> {
    try {
      const validatedBody = createAlertSchema.parse(req.body);

      const created = await alertsService.createAlert(validatedBody);

      res.status(201).json({
        message: 'Alert created successfully',
        data: created.length === 1 ? created[0] : created,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Error creating alert';
      res.status(500).json({ error: message });
    }
  }

  /**
   * READ ALL: GET /api/alerts
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = alertsQuerySchema.parse(req.query);
      const sessionUser = req.auth?.user;

      const userId =
        sessionUser?.id || (req.query.userId as string) || 'anonymous';
      const role = sessionUser?.role || validatedQuery.role || 'OFFICER';

      const alerts = await alertsService.getAlertsForUser({
        userId,
        role,
        ...(validatedQuery.region !== undefined
          ? { region: validatedQuery.region }
          : {}),
        ...(validatedQuery.unreadOnly !== undefined
          ? { unreadOnly: validatedQuery.unreadOnly }
          : {}),
      });

      res.status(200).json(alerts);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Error fetching alerts';
      res.status(500).json({ error: message });
    }
  }

  /**
   * READ ONE: GET /api/alerts/:id
   */
  async getAlertById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.auth?.user?.id;

      const alert = await alertsService.getAlertById(id as string, userId);
      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.status(200).json(alert);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error fetching alert';
      res.status(500).json({ error: message });
    }
  }

  /**
   * UPDATE: PATCH /api/alerts/:id
   */
  async updateAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedBody = updateAlertSchema.parse(req.body);

      const updated = await alertsService.updateAlert(
        id as string,
        validatedBody,
      );
      if (!updated) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.status(200).json({
        message: 'Alert updated successfully',
        data: updated,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Error updating alert';
      res.status(500).json({ error: message });
    }
  }

  /**
   * DELETE: DELETE /api/alerts/:id
   */
  async deleteAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await alertsService.deleteAlert(id as string);
      if (!deleted) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.status(200).json({ message: 'Alert deleted successfully' });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error deleting alert';
      res.status(500).json({ error: message });
    }
  }

  /**
   * MARK ONE READ: PATCH /api/alerts/:id/read
   */
  async markAlertAsRead(req: Request, res: Response): Promise<void> {
    try {
      const alertId = req.params.id as string;
      const userId =
        req.auth?.user?.id || (req.query.userId as string) || 'anonymous';

      const result = await alertsService.markAlertAsRead(alertId, userId);
      res.status(200).json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error marking alert as read';
      res.status(500).json({ error: message });
    }
  }

  /**
   * MARK ALL READ: PATCH /api/alerts/read-all
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.auth?.user?.id || (req.query.userId as string) || 'anonymous';

      const result = await alertsService.markAllAlertsAsRead(userId);
      res.status(200).json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error marking all alerts as read';
      res.status(500).json({ error: message });
    }
  }
}

export const alertsController = new AlertsController();
