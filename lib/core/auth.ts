/**
 * Role extraction utilities for authentication
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export type AppRole = "super" | "admin" | "sub_admin" | "support";

export interface CustomUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  roles?: string[];
  token?: string;
  accessToken?: string;
  tenant_id?: string;
}

export interface AuthState {
  user: AuthUser | null;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  fetchPermissions: (userId: string, headers?: Record<string, string>) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canAccess: (requiredPermission?: string, requiredRole?: string) => boolean;
}
interface RoleItem {
  role: string;
  [key: string]: unknown;
}

interface UserWithRolesCandidate {
  rolesData?: (string | RoleItem)[];
  roles?: (string | RoleItem)[];
  active_profile_role?: string;
  profiles?: RoleItem[];
  [key: string]: unknown;
}

export function extractUserRoles(user: UserWithRolesCandidate | null | undefined): string[] {
  if (!user) return [];

  // Check if rolesData exists (from dashboard layout)
  if (user.rolesData && Array.isArray(user.rolesData)) {
    return user.rolesData.map((r: string | RoleItem) => typeof r === 'string' ? r : r.role).filter(Boolean);
  }

  // Extract roles from API response format: roles: [{ role: "admin", description: "..." }]
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.map((r: string | RoleItem) => typeof r === 'string' ? r : r.role).filter(Boolean);
  }

  // Fallback to other possible sources
  // active_profile_role is a string or undefined in our interface
  if (user.active_profile_role && typeof user.active_profile_role === 'string') {
    return [user.active_profile_role];
  }

  if (user.profiles && Array.isArray(user.profiles)) {
    // We know p is RoleItem from the interface, but let's be safe if mixed
    return user.profiles.map((p: RoleItem) => p.role).filter(Boolean);
  }

  return [];
}

const authUtils = {
  extractUserRoles
};

export default authUtils;
