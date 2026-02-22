import { useDataStore } from './data-store';

/**
 * Quick access hook for commonly used user and app data
 * Provides minimal-code access to sensitive data
 */
export const useApp = () => {
  const store = useDataStore();

  return {
    // User data - one line access
    user: store.user,
    userId: store.userId,
    userName: store.userName,
    userEmail: store.userEmail,

    // Tenant data
    tenantId: store.tenantId,
    tenantName: store.tenantName,

    // Auth state
    isAuthenticated: store.isAuthenticated,
    isSuperUser: store.isSuperUser,

    // Permissions
    hasPermission: store.hasPermission,
    canAccess: store.canAccess,

    // Modules
    isModuleEnabled: store.isModuleEnabled,
    enabledModules: store.enabledModules,

    // Actions
    logout: store.logout,
    switchTenant: store.switchTenant,
    refreshCurrentTenant: store.refreshCurrentTenant,

    // Loading states
    permissionsLoading: store.permissionsLoading,
    currentTenantLoading: store.currentTenantLoading,
  } as const;
};

/**
 * Example usage patterns:
 *
 * // Get user info
 * const { userName, userEmail, tenantName } = useApp();
 *
 * // Check permissions
 * const { hasPermission, isModuleEnabled } = useApp();
 * if (hasPermission('users:create') && isModuleEnabled('affiliates')) {
 *   // Show create button
 * }
 *
 * // Access tenant data
 * const { tenantId, tenantName } = useApp();
 *
 * // Switch tenant
 * const { switchTenant } = useApp();
 * await switchTenant('tenant-123');
 */
