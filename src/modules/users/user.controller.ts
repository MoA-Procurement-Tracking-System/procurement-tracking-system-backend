import type { Request, Response, NextFunction } from 'express';
import * as usersService from './user.service.js';
import type { ListUsersQuery } from './user.types.js';

export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await usersService.listUsers(
      req.query as unknown as ListUsersQuery,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const currentUserId = req.auth?.user?.id;
    if (currentUserId && currentUserId === id && req.body.isActive === false) {
      return res
        .status(400)
        .json({ error: 'Administrators cannot deactivate their own account.' });
    }
    const user = await usersService.getUserById(id);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json({ message: 'User created', data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : '';
    const user = await usersService.updateUser(id, req.body);
    res.json({ message: 'User updated', data: user });
  } catch (err) {
    next(err);
  }
}
