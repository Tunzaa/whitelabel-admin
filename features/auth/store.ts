"use client";

import { create } from 'zustand';
import { AuthState, Permission, Role } from "./types";
import apiClient from '@/lib/api/client';
import { extractUserRoles } from '@/lib/core/auth';

// Cache to prevent redundant API calls
const permissionsCache = new Map<string, { permissions: Permission[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  isLoading: false,
  error: null,
  permissionsLoaded: false,
  setUser: (user) => set({ user, error: null }),

  clearPermissions: () => set({ permissions: [], permissionsLoaded: false }),

  fetchPermissions: async (userId: string, headers?: Record<string, string>) => {
    if (!userId) {
      set({ permissions: [], isLoading: false, permissionsLoaded: true });
      return;
    }

    const { permissionsLoaded } = get();

    // Check cache first
    const cacheKey = `${userId}-${JSON.stringify(headers || {})}`;
    const cached = permissionsCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      set({ permissions: cached.permissions, isLoading: false, permissionsLoaded: true });
      return;
    }

    // Don't fetch if already loaded and no cache miss
    if (permissionsLoaded && !cached) {
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

      // Cache the result
      permissionsCache.set(cacheKey, { permissions: permissionsData, timestamp: now });

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
    const userRoles = extractUserRoles(user);
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
