import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as svc from './lookup.service.js';
import {
  createLookupSchema,
  updateLookupSchema,
  lookupIdParamSchema,
  lookupTypeQuerySchema,
} from './lookup.validation.js';

const router = Router();

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

router.post(
  '/',
  authenticate,
  authorize(
    'Administrator',
    'DIRECTOR',
    'ProcurementDirector',
    'ADMIN',
    'OFFICER',
    'ProcurementOfficer',
    'ProjectManager',
  ),
  validate(createLookupSchema, 'body'),
  async (req, res, next) => {
    try {
      res.status(201).json({
        message: 'Lookup created',
        data: await svc.createLookup(req.body),
      });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/:id',
  authenticate,
  authorize(
    'Administrator',
    'DIRECTOR',
    'ProcurementDirector',
    'ADMIN',
    'OFFICER',
    'ProcurementOfficer',
    'ProjectManager',
  ),
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

router.delete(
  '/:id',
  authenticate,
  authorize(
    'Administrator',
    'DIRECTOR',
    'ProcurementDirector',
    'ADMIN',
    'OFFICER',
    'ProcurementOfficer',
    'ProjectManager',
  ),
  validate(lookupIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await svc.deleteLookup(req.params.id as string);
      res.json({ message: 'Lookup deleted successfully' });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
