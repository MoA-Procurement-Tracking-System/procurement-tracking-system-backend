import { ZodError, type ZodType } from 'zod';
import { type Request, type Response, type NextFunction } from 'express';
import { ApiError } from '../utils/errors.js';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodType, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'body') {
        req.body = parsed;
      } else if (parsed && typeof parsed === 'object') {
        Object.assign(req[source], parsed);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = err.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(ApiError.badRequest('Validation failed', fields));
      }
      next(err);
    }
  };
}
