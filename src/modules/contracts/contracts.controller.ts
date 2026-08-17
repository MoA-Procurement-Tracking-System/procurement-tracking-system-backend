import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ContractsService } from './contracts.service.js';
import {
  createContractSchema,
  createPaymentSchema,
  updateContractSchema,
  getContractPaymentsQuerySchema,
} from './contracts.schema.js';

const contractsService = new ContractsService();

export class ContractsController {
  async getContracts(req: Request, res: Response): Promise<void> {
    try {
      const { search, status } = req.query;
      const contracts = await contractsService.getContracts(
        search as string,
        status as string,
      );
      res.json(contracts);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      res.status(500).json({ error: message });
    }
  }

  async createContract(req: Request, res: Response): Promise<void> {
    try {
      const validated = createContractSchema.parse(req.body);
      const contract = await contractsService.createContract(validated);
      res.status(201).json(contract);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Error creating contract';
      res.status(500).json({ error: message });
    }
  }
  // ...existing code...

  async getContractById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'Invalid or missing contract ID' });
        return;
      }
      const contract = await contractsService.getContractById(id);
      if (!contract) {
        res.status(404).json({ error: 'Contract not found' });
        return;
      }
      res.status(200).json(contract);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Error fetching contract';
      res.status(400).json({ error: message });
    }
  }

  async updateContract(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'Invalid or missing contract ID' });
        return;
      }
      const validatedBody = updateContractSchema.parse(req.body);
      const updated = await contractsService.updateContract(id, validatedBody);
      res.status(200).json(updated);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Error updating contract';
      res.status(400).json({ error: message });
    }
  }

  async getContractPayments(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'Invalid or missing contract ID' });
        return;
      }
      const validatedQuery = getContractPaymentsQuerySchema.parse(req.query);
      const payments = await contractsService.getContractPayments(
        id,
        validatedQuery['filter[status]'],
      );
      res.status(200).json(payments);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Error fetching payments';
      res.status(400).json({ error: message });
    }
  }

  async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const validated = createPaymentSchema.parse(req.body);
      const result = await contractsService.recordPayment(id, validated);
      res.status(201).json(result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Invalid payment details';
      res.status(400).json({ error: message });
    }
  }
}

export const contractsController = new ContractsController();
