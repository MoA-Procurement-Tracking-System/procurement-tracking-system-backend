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

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: List of users }
 *       403: { description: Admin only }
 */
router.get(
  '/',
  authorize('Administrator', 'ProcurementDirector'),
  validate(listUsersQuerySchema, 'query'),
  listUsersHandler,
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by id
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User found }
 *       404: { description: User not found }
 */
router.get(
  '/:id',
  authorize('Administrator', 'ProcurementDirector'),
  validate(userIdParamSchema, 'params'),
  getUserHandler,
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role:
 *                 type: string
 *                 enum: [ProcurementOfficer, ProcurementDirector, Administrator, ManagementTeam, ProjectManager]
 *     responses:
 *       201: { description: User created }
 *       409: { description: Email already in use }
 */
router.post(
  '/',
  authorize('Administrator'),
  validate(createUserSchema, 'body'),
  createUserHandler,
);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update a user's profile, role, or active status
 *     tags: [Users]
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
 *               name: { type: string }
 *               email: { type: string }
 *               role:
 *                 type: string
 *                 enum: [ProcurementOfficer, ProcurementDirector, Administrator, ManagementTeam, ProjectManager]
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: User updated }
 *       404: { description: User not found }
 *       409: { description: Email already in use }
 */
router.patch(
  '/:id',
  authorize('Administrator'),
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema, 'body'),
  updateUserHandler,
);

export default router;
