import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/errors.js';
import { logger } from '../../config/logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      logger.error({ err, url: req.url, method: req.method }, err.message);
    } else {
      logger.warn({ code: err.code, url: req.url }, err.message);
    }

    return res.status(err.status).json({
      message: err.message,
      code: err.code,
      ...(err.fields && { fields: err.fields }),
    });
  }

  logger.error({ err, url: req.url, method: req.method }, 'Unexpected error');

  return res.status(500).json({
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
