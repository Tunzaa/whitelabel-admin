export type Role = string; // Allow any role from API

export type Permission = string; // e.g., 'tenants:create', 'products:read'

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  tenant_id?: string;
  role?: Role;
}

export interface AuthState {
  user: User | null;
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
  permissionsLoaded: boolean;
  setUser: (user: User | null) => void;
  clearPermissions: () => void;
  fetchPermissions: (userId: string, headers?: Record<string, string>) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: Role) => boolean;
  canAccess: (requiredPermission?: Permission, requiredRole?: Role) => boolean;
}
