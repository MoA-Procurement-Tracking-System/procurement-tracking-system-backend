import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ReportsService } from './reports.service.js';
import { reportQuerySchema } from './reports.schema.js';

const reportsService = new ReportsService();

export class ReportsController {
  async exportContractsCsv(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = reportQuerySchema.parse(req.query);
      const csvData = await reportsService.generateContractsCsv(
        validatedQuery.region,
      );

      const filename = `contracts_report_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.status(200).send(csvData);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Error generating report';
      res.status(500).json({ error: message });
    }
  }
}

export const reportsController = new ReportsController();
