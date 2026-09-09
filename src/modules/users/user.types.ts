export type UserRoleType =
  'OFFICER' | 'DIRECTOR' | 'ENDORSING_COMMITTEE' | 'MANAGEMENT' | 'ADMIN';

export type Role =
  | UserRoleType
  | 'ProcurementOfficer'
  | 'ProcurementDirector'
  | 'Administrator'
  | 'ManagementTeam'
  | 'ProjectManager';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  authRole?: UserRoleType;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  authRole?: UserRoleType;
  isActive?: boolean;
}

export interface ListUsersQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: Role;
  authRole?: UserRoleType;
  isActive?: boolean;
}

// Never includes passwordHash — this is the shape returned by every endpoint
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  displayName?: string;
  role: string;
  authRole: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
