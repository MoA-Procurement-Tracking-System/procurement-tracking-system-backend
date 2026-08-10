import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { requirePasswordChange } from '../auth/middleware/requirePasswordChange.js';
import * as svc from './lookup.service.js';
import {
  createLookupSchema,
  updateLookupSchema,
  lookupIdParamSchema,
  lookupTypeQuerySchema,
} from './lookup.validation.js';

const router = Router();
router.use(authenticate, requirePasswordChange);

/**
 * @swagger
 * /api/lookups:
 *   get:
 *     summary: List lookup values
 *     tags: [Lookups]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of lookup values }
 */
router.get(
  '/',
  validate(lookupTypeQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const type =
        typeof req.query.type === 'string' ? req.query.type : undefined;
      res.json({ data: await svc.listLookups(type) });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @swagger
 * /api/lookups/{id}:
 *   get:
 *     summary: Get a lookup value by id
 *     tags: [Lookups]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lookup value }
 *       404: { description: Not found }
 */
router.get(
  '/:id',
  validate(lookupIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      res.json({ data: await svc.getLookupById(req.params.id as string) });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @swagger
 * /api/lookups:
 *   post:
 *     summary: Create a lookup value
 *     tags: [Lookups]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, code, label]
 *             properties:
 *               type: { type: string }
 *               code: { type: string }
 *               label: { type: string }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Conflict }
 */
router.post(
  '/',
  authorize('Administrator'),
  validate(createLookupSchema, 'body'),
  async (req, res, next) => {
    try {
      res
        .status(201)
        .json({
          message: 'Lookup created',
          data: await svc.createLookup(req.body),
        });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @swagger
 * /api/lookups/{id}:
 *   patch:
 *     summary: Update a lookup value
 *     tags: [Lookups]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.patch(
  '/:id',
  authorize('Administrator'),
  validate(lookupIdParamSchema, 'params'),
  validate(updateLookupSchema, 'body'),
  async (req, res, next) => {
    try {
      res.json({
        message: 'Lookup updated',
        data: await svc.updateLookup(req.params.id as string, req.body),
      });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
