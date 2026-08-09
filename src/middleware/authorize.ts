import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors.js';

export type Role =
  | 'ProcurementOfficer'
  | 'ProcurementDirector'
  | 'Administrator'
  | 'ManagementTeam'
  | 'ProjectManager';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
  };
}

export function authorize(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role))
      return next(ApiError.forbidden());
    next();
  };
}
