"use client";

import { useMemo, useCallback } from 'react';
import useAuthStore from '../store';
import { Permission, Role } from '../types';

/**
 * Custom hook to check user permissions and roles.
 * Provides a stable interface to the auth store with memoized functions.
 *
 * @returns An object with:
 *  - `can`: A function to check if the user has a specific permission.
 *  - `hasRole`: A function to check if the user has a specific role.
 *  - `canAccess`: A function to check if the user has both permission and role.
 *  - `isLoading`: A boolean indicating if permissions are being loaded.
 *  - `permissionsLoaded`: A boolean indicating if permissions have been loaded at least once.
 *  - `permissions`: An array of all permissions the user has.
 *  - `user`: The current user object.
 */
export const usePermissions = () => {
  // Use individual hooks to avoid creating new objects and avoid getSnapshot error
  const permissions = useAuthStore((state) => state.permissions);
  const isLoading = useAuthStore((state) => state.isLoading);
  const permissionsLoaded = useAuthStore((state) => state.permissionsLoaded);
  const user = useAuthStore((state) => state.user);

  // Memoize the permission check function to prevent unnecessary re-renders
  const can = useCallback((permission: Permission) => {
    if (permissions.includes('*')) {
      return true; // Super admin can do anything
    }
    return permissions.includes(permission);
  }, [permissions]);

  // Memoize the role check function
  const hasRole = useCallback((requiredRole: Role) => {
    if (!user) {
      return false;
    }
    return user.roles.includes(requiredRole);
  }, [user]);

  // Memoize the access check function
  const canAccess = useCallback((requiredPermission?: Permission, requiredRole?: Role) => {
    // If both permission and role are required, user must have both
    if (requiredPermission && requiredRole) {
      return can(requiredPermission) && hasRole(requiredRole);
    }
    
    // If only permission is required
    if (requiredPermission) {
      return can(requiredPermission);
    }
    
    // If only role is required
    if (requiredRole) {
      return hasRole(requiredRole);
    }
    
    // If neither is specified, allow access
    return true;
  }, [can, hasRole]);

  return useMemo(() => ({
    can,
    hasRole,
    canAccess,
    isLoading,
    permissionsLoaded,
    permissions,
    user,
  }), [can, hasRole, canAccess, isLoading, permissionsLoaded, permissions, user]);
};
