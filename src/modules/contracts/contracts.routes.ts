import { Router } from 'express';
import { contractsController } from './contracts.controller.js';

const router = Router();

/**
 * @openapi
 * /api/contracts:
 *   get:
 *     summary: Retrieve list of contracts
 *     tags: [Contracts]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by contract number or sector
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (ACTIVE, COMPLETED, CANCELLED, PENDING)
 *     responses:
 *       200:
 *         description: A list of contracts
 *   post:
 *     summary: Create a new contract
 *     tags: [Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractNo
 *               - totalValue
 *             properties:
 *               contractNo:
 *                 type: string
 *               supplierId:
 *                 type: string
 *               totalValue:
 *                 type: number
 *               currency:
 *                 type: string
 *               region:
 *                 type: string
 *               sector:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contract created successfully
 */
router.get('/', (req, res) => contractsController.getContracts(req, res));
router.post('/', (req, res) => contractsController.createContract(req, res));

/**
 * @openapi
 * /api/contracts/{id}:
 *   get:
 *     summary: Get contract details by ID
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: Contract details with supplier and payments
 *       404:
 *         description: Contract not found
 *   patch:
 *     summary: Update contract details or soft-delete
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contractNo:
 *                 type: string
 *               supplierId:
 *                 type: string
 *               totalValue:
 *                 type: number
 *               currency:
 *                 type: string
 *               region:
 *                 type: string
 *               sector:
 *                 type: string
 *               isDeleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Contract updated successfully
 */
router.get('/:id', (req, res) => contractsController.getContractById(req, res));
router.patch('/:id', (req, res) =>
  contractsController.updateContract(req, res),
);

/**
 * @openapi
 * /api/contracts/{id}/payments:
 *   get:
 *     summary: Retrieve payment history for a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *       - in: query
 *         name: filter[status]
 *         schema:
 *           type: string
 *           enum: [PAID, PENDING, FAILED]
 *         description: Filter payments by status
 *     responses:
 *       200:
 *         description: List of contract payments
 *   post:
 *     summary: Record a payment for a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - referenceNo
 *               - idempotencyKey
 *             properties:
 *               amount:
 *                 type: number
 *               referenceNo:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 */
router.get('/:id/payments', (req, res) =>
  contractsController.getContractPayments(req, res),
);
router.post('/:id/payments', (req, res) =>
  contractsController.recordPayment(req, res),
);

export default router;
