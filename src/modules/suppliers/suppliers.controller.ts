import type { Request, Response } from 'express';
import { SuppliersService } from './suppliers.service.js';
import {
  createSupplierSchema,
  getSuppliersQuerySchema,
} from './suppliers.schema.js';

const suppliersService = new SuppliersService();

export async function createSupplierHandler(req: Request, res: Response) {
  try {
    const validatedBody = createSupplierSchema.parse(req.body);
    const supplier = await suppliersService.createSupplier(validatedBody);
    return res.status(201).json(supplier);
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Handles Zod validation error array or general Error instances safely
      const message =
        'errors' in error
          ? (error as { errors: unknown }).errors
          : error.message;
      return res.status(400).json({ error: message });
    }
    return res.status(400).json({ error: 'An unexpected error occurred' });
  }
}

export async function getSuppliersHandler(req: Request, res: Response) {
  try {
    const validatedQuery = getSuppliersQuerySchema.parse(req.query);
    const result = await suppliersService.getSuppliers(validatedQuery);
    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message =
        'errors' in error
          ? (error as { errors: unknown }).errors
          : error.message;
      return res.status(400).json({ error: message });
    }
    return res.status(400).json({ error: 'An unexpected error occurred' });
  }
}
