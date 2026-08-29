import {
  Prisma,
  ProjectStatus,
  RevisionEntityType,
  RevisionChangeType,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { logRevision } from '../../shared/audit/revision.service.js';

export const getProjectsService = async () => {
  return prisma.project.findMany({
    where: { isActive: true },
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
      let validUserId = userId;
      const userExists = await tx.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        const fallbackUser = await tx.user.findFirst({ select: { id: true } });
        if (fallbackUser) validUserId = fallbackUser.id;
      }
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PROJECT,
          RevisionChangeType.CREATE,
          project.id,
          validUserId,
          null,
          project,
        );
      }
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
      let validUserId = userId;
      const userExists = await tx.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        const fallbackUser = await tx.user.findFirst({ select: { id: true } });
        if (fallbackUser) validUserId = fallbackUser.id;
      }
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PROJECT,
          RevisionChangeType.UPDATE,
          id,
          validUserId,
          oldProject,
          project,
        );
      }
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
