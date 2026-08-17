import { Router } from 'express';
import { authController } from './auth.controller.js';

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset link sent
 */
router.post('/forgot-password', (req, res, next) =>
  authController.forgotPassword(req, res, next),
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 */
router.post('/reset-password', (req, res, next) =>
  authController.resetPassword(req, res, next),
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 */
router.post('/logout', (req, res, next) =>
  authController.logout(req, res, next),
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 */
router.get('/me', (req, res, next) => authController.me(req, res, next));

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 */
router.post('/change-password', (req, res, next) =>
  authController.changePassword(req, res, next),
);

export default router;
