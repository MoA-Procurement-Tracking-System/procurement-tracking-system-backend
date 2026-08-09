import { type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../../../config/database.js';
import { ApiError } from '../../../utils/errors.js';

export async function requirePasswordChange(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        mustChangePassword: true,
      },
    });

    if (!user) {
      return next(ApiError.unauthorized());
    }

    if (user.mustChangePassword) {
      return next(
        new ApiError(
          403,
          'PASSWORD_CHANGE_REQUIRED',
          'You must change your password before continuing',
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}
