import {
  Prisma,
  ProjectStatus,
  RevisionEntityType,
  RevisionChangeType,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { logRevision } from '../../shared/audit/revision.service.js';

export interface GetProjectsQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export const getProjectsService = async (
  options: GetProjectsQueryOptions = {},
) => {
  const { page, pageSize, search, status } = options;
  const isPaginated = typeof page === 'number' || typeof pageSize === 'number';

  const where: Prisma.ProjectWhereInput = {
    isActive: true,
    ...(status ? { status: status as ProjectStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { sapIdentificationNo: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const take =
    pageSize && pageSize > 0 ? Math.min(pageSize, 100) : isPaginated ? 20 : 100;

  const [projects, totalCount] = await Promise.all([
    prisma.project.findMany({
      where,
      take,
      ...(page && page > 0 ? { skip: (page - 1) * take } : {}),
      include: {
        fundingSource: true,
        sector: true,
        members: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ]);

  if (isPaginated) {
    return {
      items: projects,
      pagination: {
        total: totalCount,
        page: page || 1,
        pageSize: take,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  return projects;
};

export const getProjectByIdService = async (id: string) => {
  return prisma.project.findUnique({
    where: { id },
    include: {
      fundingSource: true,
      sector: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  });
};

export const createProjectService = async (
  data: Prisma.ProjectCreateInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const userExists = await tx.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new Error(`Authenticated user not found with id: ${userId}`);
    }

    const project = await tx.project.create({
      data: {
        ...data,
        status: ProjectStatus.ACTIVE,
      },
      include: {
        fundingSource: true,
        sector: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    try {
      await logRevision(
        tx,
        RevisionEntityType.PROJECT,
        RevisionChangeType.CREATE,
        project.id,
        userExists.id,
        null,
        project,
      );
    } catch (auditErr) {
      console.warn('logRevision warning:', auditErr);
    }

    return project;
  });
};

export const updateProjectService = async (
  id: string,
  data: Prisma.ProjectUpdateInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const userExists = await tx.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new Error(`Authenticated user not found with id: ${userId}`);
    }

    const oldProject = await tx.project.findUniqueOrThrow({ where: { id } });

    const project = await tx.project.update({
      where: { id },
      data,
      include: {
        fundingSource: true,
        sector: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    try {
      await logRevision(
        tx,
        RevisionEntityType.PROJECT,
        RevisionChangeType.UPDATE,
        id,
        userExists.id,
        oldProject,
        project,
      );
    } catch (auditErr) {
      console.warn('logRevision warning:', auditErr);
    }

    return project;
  });
};

export const assignOfficerService = async (
  projectId: string,
  officerId: string,
) => {
  return prisma.userProject.upsert({
    where: {
      userId_projectId: {
        userId: officerId,
        projectId,
      },
    },
    update: {},
    create: {
      projectId,
      userId: officerId,
    },
  });
};

export const removeOfficerService = async (
  projectId: string,
  officerId: string,
) => {
  return prisma.userProject.delete({
    where: {
      userId_projectId: {
        userId: officerId,
        projectId,
      },
    },
  });
};
