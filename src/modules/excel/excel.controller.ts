import type { Request, Response } from 'express';
import fs from 'fs';
import { excelService } from './excel.service.js';

export class ExcelController {
  async exportActivitiesTemplate(req: Request, res: Response): Promise<void> {
    try {
      await excelService.generateActivitiesTemplate(res);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: `Failed to generate activities template: ${msg}` });
    }
  }

  async exportContractsTemplate(req: Request, res: Response): Promise<void> {
    try {
      await excelService.generateContractsTemplate(res);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: `Failed to generate contracts template: ${msg}` });
    }
  }

  async exportSuppliersTemplate(req: Request, res: Response): Promise<void> {
    try {
      await excelService.generateSuppliersTemplate(res);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: `Failed to generate suppliers template: ${msg}` });
    }
  }

  async importActivities(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    try {
      const stats = await excelService.importActivities(req.file.path);
      res.status(200).json({
        message: 'Activities imported successfully.',
        ...stats,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: `Import failed: ${msg}` });
    } finally {
      this.cleanupUploadedFile(req.file.path);
    }
  }

  async importContracts(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    try {
      const stats = await excelService.importContracts(req.file.path);
      res.status(200).json({
        message: 'Contracts imported successfully.',
        ...stats,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: `Import failed: ${msg}` });
    } finally {
      this.cleanupUploadedFile(req.file.path);
    }
  }

  async importSuppliers(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    try {
      const stats = await excelService.importSuppliers(req.file.path);
      res.status(200).json({
        message: 'Suppliers imported successfully.',
        ...stats,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: `Import failed: ${msg}` });
    } finally {
      this.cleanupUploadedFile(req.file.path);
    }
  }

  private cleanupUploadedFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete temporary file: ${filePath}`, err);
    }
  }
}

export const excelController = new ExcelController();
