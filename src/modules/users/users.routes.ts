import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from './user.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
} from './user.validation.js';

const router = Router();

// Bridge session auth → req.user so the authorize() middleware works
const bridgeAuth: RequestHandler = (req, _res, next) => {
  if (req.auth?.user) {
    const roleMap: Record<string, string> = {
      ADMIN: 'Administrator',
      OFFICER: 'ProcurementOfficer',
      DIRECTOR: 'ProcurementDirector',
      ENDORSING_COMMITTEE: 'ManagementTeam',
      MANAGEMENT: 'ManagementTeam',
    };
    const userAuthRole = req.auth.user.role;
    const mappedRole = roleMap[userAuthRole] || userAuthRole;
    (req as unknown as Record<string, unknown>).user = {
      id: req.auth.user.id,
      role: mappedRole,
    };
  }
  next();
};

// Every route below requires a valid session cookie AND a fully authenticated session
router.use(loadSession, requireAuthenticated, bridgeAuth);

router.get(
  '/',
  authorize('Administrator', 'ProcurementDirector'),
  validate(listUsersQuerySchema, 'query'),
  listUsersHandler,
);

router.get(
  '/:id',
  authorize('Administrator', 'ProcurementDirector'),
  validate(userIdParamSchema, 'params'),
  getUserHandler,
);

router.post(
  '/',
  authorize('Administrator'),
  validate(createUserSchema, 'body'),
  createUserHandler,
);

router.patch(
  '/:id',
  authorize('Administrator'),
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema, 'body'),
  updateUserHandler,
);

router.delete(
  '/:id',
  authorize('Administrator'),
  validate(userIdParamSchema, 'params'),
  deleteUserHandler,
);

export default router;
