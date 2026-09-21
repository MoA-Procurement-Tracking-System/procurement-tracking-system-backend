import { Router } from 'express';
import {
  createSupplierHandler,
  getSuppliersHandler,
} from './suppliers.controller.js';
import { authenticate } from '../../middleware/auth.js';
import './suppliers.schema.js';

const router = Router();

// Protect all supplier routes with authentication
router.use(authenticate);

router.get('/', getSuppliersHandler);
router.post('/', createSupplierHandler);

export default router;
