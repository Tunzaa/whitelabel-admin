"use client";

import { create } from 'zustand';
import { Permission, Role, User } from '../features/auth/types';
import apiClient from '../lib/api/client';
import { extractUserRoles } from '../lib/core/auth';
import {
  setCachedPermissions,
  getCachedPermissions,
  setCachedModules,
  getCachedModules,
  setCachedData,
  getCachedData,
  clearCache,
  CACHE_KEYS
} from '../lib/cache';

// Types
export interface Tenant {
  tenant_id: string;
  name: string;
  modules: Record<string, boolean>;
  [key: string]: any;
}

export interface AppUser extends User {
  // Additional computed properties for easy access
  displayName: string;
  isSuperUser: boolean;
  isAdmin: boolean;
  currentTenantId: string;
}

export interface DataState {
  // User data
  user: AppUser | null;
  isAuthenticated: boolean;

  // Permissions
  permissions: Permission[];
  permissionsLoaded: boolean;
  permissionsLoading: boolean;

  // Current tenant
  currentTenant: Tenant | null;
  currentTenantLoading: boolean;
  currentTenantModules: Record<string, boolean>;

  // All tenants (for super users)
  allTenants: Tenant[];
  allTenantsLoaded: boolean;
  allTenantsLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;

  // Permission actions
  fetchPermissions: (userId?: string, tenantId?: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  canAccess: (requiredPermission?: Permission, requiredRole?: Role) => boolean;

  // Tenant actions
  fetchCurrentTenant: (tenantId: string) => Promise<void>;
  fetchAllTenants: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshCurrentTenant: () => Promise<void>;
  isModuleEnabled: (moduleName: string) => boolean;

  // Utility getters
  get userId(): string | null;
  get userName(): string | null;
  get userEmail(): string | null;
  get tenantId(): string | null;
  get tenantName(): string | null;
  get isSuperUser(): boolean;
  get enabledModules(): string[];
}

// Cache types
interface CachedTenants {
  tenants: Tenant[];
  timestamp: number;
}

// Create the centralized data store
export const useDataStore = create<DataState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  permissions: [],
  permissionsLoaded: false,
  permissionsLoading: false,
  currentTenant: null,
  currentTenantLoading: false,
  currentTenantModules: {},
  allTenants: [],
  allTenantsLoaded: false,
  allTenantsLoading: false,

  // Computed getters
  get userId() {
    return get().user?.id || null;
  },

  get userName() {
    return get().user?.name || null;
  },

  get userEmail() {
    return get().user?.email || null;
  },

  get tenantId() {
    return get().user?.currentTenantId || null;
  },

  get tenantName() {
    return get().currentTenant?.name || null;
  },

  get isSuperUser() {
    return get().user?.isSuperUser || false;
  },

  get enabledModules() {
    const modules = get().currentTenantModules;
    return Object.keys(modules).filter(module => modules[module]);
  },

  // Actions
  setUser: (user) => {
    if (user) {
      const appUser: AppUser = {
        ...user,
        displayName: user.name,
        isSuperUser: extractUserRoles(user as any).includes('super'),
        isAdmin: extractUserRoles(user as any).includes('admin'),
        currentTenantId: user.tenant_id || '',
      };
      set({
        user: appUser,
        isAuthenticated: true
      });
    } else {
      set({
        user: null,
        isAuthenticated: false,
        permissions: [],
        permissionsLoaded: false,
        currentTenant: null,
        currentTenantModules: {},
        allTenants: [],
        allTenantsLoaded: false,
      });
    }
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      permissions: [],
      permissionsLoaded: false,
      permissionsLoading: false,
      currentTenant: null,
      currentTenantLoading: false,
      currentTenantModules: {},
      allTenants: [],
      allTenantsLoaded: false,
      allTenantsLoading: false,
    });
    // Clear all cached data
    clearCache();
  },

  // Permission methods
  fetchPermissions: async (userId, tenantId) => {
    const { user } = get();
    const targetUserId = userId || user?.id;
    const targetTenantId = tenantId || user?.currentTenantId;

    if (!targetUserId || !targetTenantId) return;

    // Check cache first
    const cachedPermissions = getCachedPermissions(targetTenantId, targetUserId);
    if (cachedPermissions) {
      set({
        permissions: cachedPermissions,
        permissionsLoaded: true,
        permissionsLoading: false
      });
      return;
    }

    // Don't fetch if already loaded
    if (get().permissionsLoaded) return;

    set({ permissionsLoading: true });

    try {
      const headers = { 'X-Tenant-ID': targetTenantId };
      const response = await apiClient.get<any>(
        `/auth/roles/users/${targetUserId}/permissions`,
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
      setCachedPermissions(permissionsData, targetTenantId, targetUserId);

      set({
        permissions: permissionsData,
        permissionsLoaded: true,
        permissionsLoading: false
      });
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      set({
        permissions: [],
        permissionsLoaded: true,
        permissionsLoading: false
      });
    }
  },

  hasPermission: (permission) => {
    const { permissions } = get();
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  },

  canAccess: (requiredPermission, requiredRole) => {
    const { hasPermission, user } = get();

    // If both permission and role are required, user must have both
    if (requiredPermission && requiredRole) {
      return hasPermission(requiredPermission) && extractUserRoles(user as any).includes(requiredRole);
    }

    // If only permission is required
    if (requiredPermission) {
      return hasPermission(requiredPermission);
    }

    // If only role is required
    if (requiredRole) {
      return extractUserRoles(user as any).includes(requiredRole);
    }

    // If neither is specified, allow access
    return true;
  },

  // Tenant methods
  fetchCurrentTenant: async (tenantId) => {
    if (!tenantId) return;

    // Check cache first
    const cachedModules = getCachedModules(tenantId);
    if (cachedModules) {
      const cachedTenant: Tenant = {
        tenant_id: tenantId,
        name: `Tenant ${tenantId}`, // Would need to cache full tenant data
        modules: cachedModules,
      };
      set({
        currentTenant: cachedTenant,
        currentTenantModules: cachedModules,
        currentTenantLoading: false
      });
      return;
    }

    set({ currentTenantLoading: true });

    try {
      const response = await apiClient.get<any>(`/tenants/${tenantId}`);

      // Handle different possible API response structures
      let tenantData: any = response.data;

      // Check if response.data is wrapped in another data property
      if (tenantData && tenantData.data && typeof tenantData.data === 'object' && tenantData.data.tenant_id) {
        tenantData = tenantData.data;
      }

      // Validate that we have a proper tenant object
      if (!tenantData || typeof tenantData !== 'object' || !tenantData.tenant_id) {
        console.error('Invalid tenant API response:', response);
        throw new Error('Invalid tenant data received from API');
      }

      // Ensure tenantData matches Tenant interface
      const validatedTenant: Tenant = {
        tenant_id: tenantData.tenant_id,
        name: tenantData.name || `Tenant ${tenantData.tenant_id}`,
        modules: tenantData.modules || {},
        ...tenantData, // Include any other properties
      };

      // Cache modules
      setCachedModules(validatedTenant.modules, tenantId);

      set({
        currentTenant: validatedTenant,
        currentTenantModules: validatedTenant.modules,
        currentTenantLoading: false
      });
    } catch (error) {
      console.error("Failed to fetch current tenant:", error);
      set({
        currentTenant: null,
        currentTenantModules: {},
        currentTenantLoading: false
      });
    }
  },

  fetchAllTenants: async () => {
    const { isSuperUser } = get();
    if (!isSuperUser) return;

    // Check cache first
    const cachedTenants = getCachedData<CachedTenants>(CACHE_KEYS.TENANTS);
    if (cachedTenants?.tenants) {
      set({
        allTenants: cachedTenants.tenants,
        allTenantsLoaded: true,
        allTenantsLoading: false
      });
      return;
    }

    set({ allTenantsLoading: true });

    try {
      const response = await apiClient.get<any>('/tenants');
      const tenantsData: Tenant[] = response.data.data || response.data;

      // Cache the result
      setCachedData(CACHE_KEYS.TENANTS, { tenants: tenantsData, timestamp: Date.now() });

      set({
        allTenants: tenantsData,
        allTenantsLoaded: true,
        allTenantsLoading: false
      });
    } catch (error) {
      console.error("Failed to fetch all tenants:", error);
      set({
        allTenants: [],
        allTenantsLoaded: true,
        allTenantsLoading: false
      });
    }
  },

  switchTenant: async (tenantId) => {
    const { user, fetchCurrentTenant, fetchPermissions } = get();

    if (!user) return;

    // Update user's current tenant
    const updatedUser: AppUser = {
      ...user,
      currentTenantId: tenantId,
      tenant_id: tenantId,
    };

    set({ user: updatedUser });

    // Fetch new tenant data and permissions
    await Promise.all([
      fetchCurrentTenant(tenantId),
      fetchPermissions(user.id, tenantId)
    ]);
  },

  refreshCurrentTenant: async () => {
    const { tenantId, fetchCurrentTenant, fetchPermissions, user } = get();

    if (!tenantId || !user) return;

    // Clear current tenant cache
    clearCache('modules', tenantId);
    clearCache('permissions', tenantId, user.id);

    // Refetch data
    await Promise.all([
      fetchCurrentTenant(tenantId),
      fetchPermissions(user.id, tenantId)
    ]);
  },

  isModuleEnabled: (moduleName) => {
    const { currentTenantModules } = get();
    return currentTenantModules[moduleName] || false;
  },
}));

// Convenience hooks for easy access
export const useUser = () => {
  try {
    const user = useDataStore((state) => state.user);
    return user;
  } catch (error) {
    console.warn('Error in useUser hook:', error);
    return null;
  }
};

export const usePermissions = () => {
  try {
    const permissions = useDataStore((state) => state.permissions);
    const hasPermission = useDataStore((state) => state.hasPermission);
    const canAccess = useDataStore((state) => state.canAccess);
    const permissionsLoaded = useDataStore((state) => state.permissionsLoaded);
    const permissionsLoading = useDataStore((state) => state.permissionsLoading);

    return {
      permissions: Array.isArray(permissions) ? permissions : [],
      hasPermission: typeof hasPermission === 'function' ? hasPermission : (() => false),
      canAccess: typeof canAccess === 'function' ? canAccess : (() => true),
      permissionsLoaded: Boolean(permissionsLoaded),
      permissionsLoading: Boolean(permissionsLoading),
    };
  } catch (error) {
    console.warn('Error in usePermissions hook:', error);
    return {
      permissions: [],
      hasPermission: () => false,
      canAccess: () => true,
      permissionsLoaded: false,
      permissionsLoading: false,
    };
  }
};

export const useTenant = () => {
  try {
    const currentTenantRaw = useDataStore((state) => state.currentTenant);
    const currentTenantModules = useDataStore((state) => state.currentTenantModules);
    const isModuleEnabled = useDataStore((state) => state.isModuleEnabled);
    const enabledModules = useDataStore((state) => state.enabledModules);
    const currentTenantLoading = useDataStore((state) => state.currentTenantLoading);
    const refreshCurrentTenant = useDataStore((state) => state.refreshCurrentTenant);

    // Ensure currentTenant is properly typed
    const currentTenant: Tenant | null = currentTenantRaw && typeof currentTenantRaw === 'object' && currentTenantRaw.tenant_id
      ? currentTenantRaw as Tenant
      : null;

    return {
      currentTenant,
      currentTenantModules: (currentTenantModules && typeof currentTenantModules === 'object') ? currentTenantModules : {},
      isModuleEnabled: typeof isModuleEnabled === 'function' ? isModuleEnabled : (() => false),
      enabledModules: Array.isArray(enabledModules) ? enabledModules : [],
      currentTenantLoading: Boolean(currentTenantLoading),
      refreshCurrentTenant: typeof refreshCurrentTenant === 'function' ? refreshCurrentTenant : (() => Promise.resolve()),
    };
  } catch (error) {
    console.warn('Error in useTenant hook:', error);
    return {
      currentTenant: null,
      currentTenantModules: {},
      isModuleEnabled: () => false,
      enabledModules: [],
      currentTenantLoading: false,
      refreshCurrentTenant: () => Promise.resolve(),
    };
  }
};

export const useTenants = () => {
  try {
    const allTenants = useDataStore((state) => state.allTenants);
    const allTenantsLoaded = useDataStore((state) => state.allTenantsLoaded);
    const allTenantsLoading = useDataStore((state) => state.allTenantsLoading);
    const fetchAllTenants = useDataStore((state) => state.fetchAllTenants);
    const switchTenant = useDataStore((state) => state.switchTenant);

    return {
      allTenants: Array.isArray(allTenants) ? allTenants : [],
      allTenantsLoaded: Boolean(allTenantsLoaded),
      allTenantsLoading: Boolean(allTenantsLoading),
      fetchAllTenants: typeof fetchAllTenants === 'function' ? fetchAllTenants : (() => Promise.resolve()),
      switchTenant: typeof switchTenant === 'function' ? switchTenant : (() => Promise.resolve()),
    };
  } catch (error) {
    console.warn('Error in useTenants hook:', error);
    return {
      allTenants: [],
      allTenantsLoaded: false,
      allTenantsLoading: false,
      fetchAllTenants: () => Promise.resolve(),
      switchTenant: () => Promise.resolve(),
    };
  }
};

export default useDataStore;
