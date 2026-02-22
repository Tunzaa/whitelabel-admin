"use client";

import { create } from 'zustand';
import { AuthState, Permission, Role } from "./types";
import apiClient from '@/lib/api/client';
import { extractUserRoles } from '@/lib/core/auth';
import { setCachedPermissions, getCachedPermissions, clearCache } from '@/lib/cache';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  isLoading: false,
  error: null,
  permissionsLoaded: false,
  setUser: (user) => set({ user, error: null }),

  clearPermissions: () => {
    set({ permissions: [], permissionsLoaded: false });
    // Clear all permission caches
    clearCache('permissions');
  },

  logout: () => {
    set({
      user: null,
      permissions: [],
      isLoading: false,
      error: null,
      permissionsLoaded: false
    });
    // Clear all cached data on logout
    clearCache();
  },

  fetchPermissions: async (userId: string, headers?: Record<string, string>) => {
    if (!userId) {
      set({ permissions: [], isLoading: false, permissionsLoaded: true });
      return;
    }

    const { permissionsLoaded } = get();
    const tenantId = headers?.['X-Tenant-ID'] || 'unknown';

    // Check persistent cache first
    const cachedPermissions = getCachedPermissions(tenantId, userId);
    if (cachedPermissions) {
      set({ permissions: cachedPermissions, isLoading: false, permissionsLoaded: true });
      return;
    }

    // Don't fetch if already loaded and no cache miss
    if (permissionsLoaded && !cachedPermissions) {
      return;
    }

    set({ isLoading: true });
    try {
      const response = await apiClient.get<any>(
        `/auth/roles/users/${userId}/permissions`,
        undefined,
        headers
      );

      let permissionsData: Permission[] = [];
      if (response.data && response.data.data) {
        permissionsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        permissionsData = response.data;
      }

      // Cache the result persistently
      setCachedPermissions(permissionsData, tenantId, userId);

      set({ permissions: permissionsData, isLoading: false, permissionsLoaded: true });
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      set({ permissions: [], isLoading: false, permissionsLoaded: true, error: error instanceof Error ? error.message : 'Failed to fetch permissions' });
    }
  },

  hasPermission: (requiredPermission: Permission) => {
    const { permissions } = get();
    if (permissions.includes('*')) {
      return true; // Super admin can do anything
    }
    return permissions.includes(requiredPermission);
  },

  hasRole: (requiredRole: Role) => {
    const { user } = get();
    if (!user) {
      return false;
    }
    const userRoles = extractUserRoles(user as any);
    return userRoles.includes(requiredRole);
  },

  canAccess: (requiredPermission?: Permission, requiredRole?: Role) => {
    const { hasPermission, hasRole } = get();

    // If both permission and role are required, user must have both
    if (requiredPermission && requiredRole) {
      return hasPermission(requiredPermission) && hasRole(requiredRole);
    }

    // If only permission is required
    if (requiredPermission) {
      return hasPermission(requiredPermission);
    }

    // If only role is required
    if (requiredRole) {
      return hasRole(requiredRole);
    }

    // If neither is specified, allow access
    return true;
  },
}));

export default useAuthStore;
