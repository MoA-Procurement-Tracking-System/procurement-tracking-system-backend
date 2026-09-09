import type { Request, Response, NextFunction } from 'express';
import * as projectService from './project.service.js';
import { ApiError } from '../../utils/errors.js';

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = req.query.page
      ? parseInt(String(req.query.page), 10)
      : undefined;
    const pageSize = req.query.pageSize
      ? parseInt(String(req.query.pageSize), 10)
      : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;

    const projects = await projectService.getProjectsService({
      page,
      pageSize,
      search,
      status,
    });
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const project = await projectService.getProjectByIdService(
      req.params.id as string,
    );
    if (!project) {
      return next(ApiError.notFound('Project not found'));
    }
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const project = await projectService.createProjectService(
      req.body,
      req.user.id,
    );
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const project = await projectService.updateProjectService(
      req.params.id as string,
      req.body,
      req.user.id,
    );
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const assignOfficer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const assignment = await projectService.assignOfficerService(
      req.params.id as string,
      req.body.officerId,
    );
    res.status(201).json(assignment);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return res
        .status(409)
        .json({ error: 'Officer is already assigned to this project.' });
    }
    next(error);
  }
};

export const removeOfficer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    await projectService.removeOfficerService(
      req.params.id as string,
      req.params.officerId as string,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
