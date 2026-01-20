/**
 * Role extraction utilities for authentication
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface CustomUser {
  id: string;
  name: string;
  email: string;
  role?: string;
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
export function extractUserRoles(user: any): string[] {
  if (!user) return [];

  // Check if rolesData exists (from dashboard layout)
  if (user.rolesData && Array.isArray(user.rolesData)) {
    return user.rolesData.map((r: any) => typeof r === 'string' ? r : r.role).filter(Boolean);
  }

  // Extract roles from API response format: roles: [{ role: "admin", description: "..." }]
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.map((r: any) => typeof r === 'string' ? r : r.role).filter(Boolean);
  }

  // Fallback to other possible sources
  if (user.active_profile_role) {
    return [user.active_profile_role];
  }

  if (user.profiles && Array.isArray(user.profiles)) {
    return user.profiles.map((p: any) => p.role).filter(Boolean);
  }

  return [];
}

export default {
  extractUserRoles
};
