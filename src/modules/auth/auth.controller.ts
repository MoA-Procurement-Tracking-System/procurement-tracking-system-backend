import type { NextFunction, Request, Response } from 'express';
import { authService } from './auth.service.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validation.js';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const result = loginSchema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        }));

        return res.status(400).json({
          message: 'Validation failed',
          errors,
        });
      }

      const data = await authService.login(result.data);

      return res.status(200).json({
        message: 'Login successful',
        data,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed';

      if (message === 'Invalid email or password') {
        return res.status(401).json({
          message,
        });
      }

      if (message === 'Account is inactive') {
        return res.status(403).json({
          message,
        });
      }

      console.error(error);

      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = forgotPasswordSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        });
      }

      await authService.forgotPassword(result.data.email);

      // Deliberately identical whether the email exists or not.
      return res.status(200).json({
        message: 'If that email exists, a reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = resetPasswordSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        });
      }

      await authService.resetPassword(
        result.data.token,
        result.data.newPassword,
      );

      return res.status(200).json({
        message: 'Password reset successful. Please log in again.',
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return res.status(401).json({ message: 'Authentication required' });
      const refreshToken =
        (req.body as { refreshToken?: string }).refreshToken ?? '';
      await authService.logout(req.user.id, refreshToken);
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user)
        return res.status(401).json({ message: 'Authentication required' });
      const user = await authService.getMe(req.user.id);
      return res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = changePasswordSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      await authService.changePassword(
        req.user.id,
        result.data.currentPassword,
        result.data.newPassword,
      );

      return res.status(200).json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
