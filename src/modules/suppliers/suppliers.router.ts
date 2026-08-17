import { Router } from 'express';
import {
  createSupplierHandler,
  getSuppliersHandler,
} from './suppliers.controller.js';

const router = Router();

/**
 * @openapi
 * /api/suppliers:
 *   get:
 *     summary: Retrieve list of suppliers
 *     tags: [Suppliers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search suppliers by name or TIN number
 *       - in: query
 *         name: filter[status]
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter suppliers by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: A paginated list of suppliers
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', getSuppliersHandler);

/**
 * @openapi
 * /api/suppliers:
 *   post:
 *     summary: Register a new supplier
 *     tags: [Suppliers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - tinNumber
 *             properties:
 *               name:
 *                 type: string
 *                 example: Global Tech PLC
 *               tinNumber:
 *                 type: string
 *                 example: "0012345678"
 *               email:
 *                 type: string
 *                 example: vendor@globaltech.et
 *               phone:
 *                 type: string
 *                 example: "+251911223344"
 *               address:
 *                 type: string
 *                 example: Addis Ababa, Ethiopia
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 default: ACTIVE
 *     responses:
 *       201:
 *         description: Supplier registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/', createSupplierHandler);

export default router;
