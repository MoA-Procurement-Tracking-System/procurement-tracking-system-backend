import type { Request, Response } from 'express';
import * as projectService from './project.service.js';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await projectService.getProjectsService();
    res.status(200).json(projects);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const project = await projectService.getProjectByIdService(
      req.params.id as string,
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const createProject = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const project = await projectService.createProjectService(
      req.body,
      req.user?.id || 'test-user-id',
    );
    res.status(201).json(project);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const updateProject = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    const project = await projectService.updateProjectService(
      req.params.id as string,
      req.body,
      req.user?.id || 'test-user-id',
    );
    res.status(200).json(project);
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const assignOfficer = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
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
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const removeOfficer = async (
  req: Request & { user?: { id: string } },
  res: Response,
) => {
  try {
    await projectService.removeOfficerService(
      req.params.id as string,
      req.params.officerId as string,
    );
    res.status(204).send();
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
