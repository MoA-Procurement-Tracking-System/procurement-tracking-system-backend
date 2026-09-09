import type { UserRole } from '../../generated/prisma/index.js';

export type Role =
  | 'ProcurementOfficer'
  | 'ProcurementDirector'
  | 'Administrator'
  | 'ManagementTeam'
  | 'ProjectManager'
  | UserRole;

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  authRole?: UserRole;
  mustChangePassword: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
