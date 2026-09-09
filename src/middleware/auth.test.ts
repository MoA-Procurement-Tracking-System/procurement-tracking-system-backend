import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  authorize,
  requirePasswordChange,
  type AuthenticatedUser,
} from './auth.js';
import { ApiError } from '../utils/errors.js';

describe('Unified Authorization Middleware', () => {
  const createMockReq = (user?: Partial<AuthenticatedUser>): Request =>
    ({
      user: user as AuthenticatedUser | undefined,
    }) as unknown as Request;

  const mockRes = {} as Response;

  it('rejects unauthenticated requests with 401 Unauthorized', () => {
    const req = createMockReq(undefined);
    const next: NextFunction = vi.fn();

    authorize('Administrator')(req, mockRes, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as { mock: { calls: [[ApiError]] } }).mock
      .calls[0][0];
    expect(error.status).toBe(401);
  });

  it('allows access when user role matches PascalCase legacy role', () => {
    const req = createMockReq({
      role: 'ProcurementOfficer',
      authRole: 'OFFICER',
    });
    const next: NextFunction = vi.fn();

    authorize('ProcurementOfficer')(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows access when user role matches canonical UserRole enum', () => {
    const req = createMockReq({
      role: 'ProcurementOfficer',
      authRole: 'OFFICER',
    });
    const next: NextFunction = vi.fn();

    authorize('OFFICER')(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows Administrator access to protected routes regardless of specified role', () => {
    const req = createMockReq({
      role: 'Administrator',
      authRole: 'ADMIN',
    });
    const next: NextFunction = vi.fn();

    authorize('ProcurementOfficer')(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects unauthorized roles with 403 Forbidden', () => {
    const req = createMockReq({
      role: 'ProcurementOfficer',
      authRole: 'OFFICER',
    });
    const next: NextFunction = vi.fn();

    authorize('ProcurementDirector')(req, mockRes, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as { mock: { calls: [[ApiError]] } }).mock
      .calls[0][0];
    expect(error.status).toBe(403);
  });
});

describe('requirePasswordChange Middleware', () => {
  const mockRes = {} as Response;

  it('blocks users who must change password', () => {
    const req = {
      user: { mustChangePassword: true },
    } as unknown as Request;
    const next: NextFunction = vi.fn();

    requirePasswordChange(req, mockRes, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (next as unknown as { mock: { calls: [[ApiError]] } }).mock
      .calls[0][0];
    expect(error.status).toBe(403);
  });

  it('allows users who completed password change', () => {
    const req = {
      user: { mustChangePassword: false },
    } as unknown as Request;
    const next: NextFunction = vi.fn();

    requirePasswordChange(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
  });
});
