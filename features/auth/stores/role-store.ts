import { create } from 'zustand';
import { Role, Permission, RoleAction, RoleError, RoleFilter, RoleListResponse } from '../types/role';
import { apiClient } from '@/lib/api/client';

interface RoleStore {
  roles: Role[],
  selectedRole: null,
  role: Role | null;
  permissions: Permission[];
  loading: boolean;
  storeError: RoleError | null;
  activeAction: RoleAction | null;
  selectedRole: Role | null;
  searchQuery: string;
  
  // State management
  setActiveAction: (action: RoleAction | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: RoleError | null) => void;
  setRole: (role: Role | null) => void;
  setRoles: (roles: Role[]) => void;
  setPermissions: (permissions: Permission[]) => void;
  selectRole: (role: Role | null) => void;
  setSearchQuery: (query: string) => void;
  
  // API methods
  fetchRoles: (filter?: RoleFilter, headers?: Record<string, string>) => Promise<RoleListResponse>;
  fetchAvailablePermissions: (headers?: Record<string, string>) => Promise<Permission[]>;
  fetchUserPermissions: (userId: string, headers?: Record<string, string>) => Promise<Permission[]>;
  createRole: (data: Partial<Role>, headers?: Record<string, string>) => Promise<Role>;
  updateRole: (id: string, data: Partial<Role>, headers?: Record<string, string>) => Promise<Role>;
  deleteRole: (id: string, headers?: Record<string, string>) => Promise<void>;
  assignRoleToUser: (userId: string, roleData: { role: string; display_name: string }, headers?: Record<string, string>) => Promise<void>;
  removeRoleFromUser: (userId: string, role: string, headers?: Record<string, string>) => Promise<void>;
  
  // Local methods
  getRole: (id: string) => Role | undefined;
  getPermission: (id: string) => Permission | undefined;
  getPermissionsByModule: (module: string) => Permission[];
  getFilteredRoles: () => Role[];
}

export const useRoleStore = create<RoleStore>()(
  (set, get) => ({
  roles: [],
  selectedRole: null,
  role: null,
  permissions: [],
  loading: false,
  storeError: null,
  activeAction: null,
  searchQuery: '',
  // State setters
  setActiveAction: (action) => set({ activeAction: action }),
  setLoading: (loading) => set({ loading }),
  setStoreError: (error) => set({ storeError: error }),
  setRole: (role) => set({ role }),
  setRoles: (roles) => set({ roles }),
  setPermissions: (permissions) => set({ permissions }),
  selectRole: (role) => set({ selectedRole: role }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // Helper methods
  getRole: (id) => get().roles.find(role => role.id === id || role.role_id === id),
  getPermission: (id) => get().permissions.find(permission => 
    permission.id === id || permission.permission_id === id
  ),
  getPermissionsByModule: (module) => 
    get().permissions.filter(permission => permission.module === module),
  
  // API methods
  fetchRoles: async (filter: RoleFilter = {}, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError, setRoles } = get();
    try {
      setActiveAction('fetchMany');
      setLoading(true);
      
      // Build query parameters from filter
      const queryParams: Record<string, any> = { ...filter };
      
      const response = await apiClient.get<any>('/auth/roles', queryParams, headers);
      
      let roleData;
      let totalCount = 0;
      
      // Try to extract data from different response structures
      if (response.data && response.data.data) {
        roleData = response.data.data;
        totalCount = response.data.total || response.data.data.length;
      } else if (response.data && Array.isArray(response.data)) {
        roleData = response.data;
        totalCount = response.data.length;
      } else if (response.data) {
        roleData = response.data.roles || response.data.items || [];
        totalCount = response.data.total || roleData.length;
      }
      
      if (Array.isArray(roleData)) {
        setRoles(roleData);
        setLoading(false);
        return {
          data: roleData,
          total: totalCount,
          page: filter.page || 1,
          limit: filter.limit || 10
        };
      }
      
      throw new Error('Failed to parse role data from response');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch roles';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  fetchAvailablePermissions: async (headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError, setPermissions } = get();
    try {
      setActiveAction('fetchMany');
      setLoading(true);
      
      const response = await apiClient.get<any>('/auth/roles/permissions', undefined, headers);
      
      let permissionsData;
      
      if (response.data && response.data.data) {
        permissionsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        permissionsData = response.data;
      } else if (response.data) {
        permissionsData = response.data.permissions || [];
      }
      
      if (Array.isArray(permissionsData)) {
        setPermissions(permissionsData);
        setLoading(false);
        return permissionsData as Permission[];
      }
      
      throw new Error('Failed to parse permissions data from response');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch available permissions';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  fetchUserPermissions: async (userId: string, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError } = get();
    try {
      setActiveAction('fetchMany');
      setLoading(true);
      
      const response = await apiClient.get<any>(`/auth/roles/users/${userId}/permissions`, undefined, headers);
      
      let permissionsData;
      
      if (response.data && response.data.data) {
        permissionsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        permissionsData = response.data;
      } else if (response.data) {
        permissionsData = response.data.permissions || [];
      }
      
      setLoading(false);
      return (Array.isArray(permissionsData) ? permissionsData : []) as Permission[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user permissions';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  createRole: async (data: Partial<Role>, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError, fetchRoles } = get();
    try {
      setActiveAction('create');
      setLoading(true);

      const response = await apiClient.post<any>('/auth/roles', data, headers);

      let createdRole;
      if (response.data && response.data.data) {
        createdRole = response.data.data;
      } else if (response.data) {
        createdRole = response.data;
      }

      // If we are here, the request was successful.
      // Refresh the role list and return the created role.
      await fetchRoles(undefined, headers);
      setLoading(false);
      return createdRole as Role;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create role';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  updateRole: async (
    id: string,
    data: Partial<Role>,
    headers?: Record<string, string>
  ) => {
    const { setActiveAction, setLoading, setStoreError, fetchRoles } = get();
    try {
      setActiveAction('update');
      setLoading(true);

      const response = await apiClient.put<any>(
        `/auth/roles/${id}`,
        data,
        headers
      );

      let updatedRole;
      if (response.data && response.data.data) {
        updatedRole = response.data.data;
      } else if (response.data) {
        updatedRole = response.data;
      }

      // If we are here, the request was successful.
      // Refresh the role list and return the updated role.
      await fetchRoles(undefined, headers);
      setLoading(false);
      return updatedRole as Role;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update role';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },
  
  deleteRole: async (id: string, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError, fetchRoles } = get();
    try {
      setActiveAction('delete');
      setLoading(true);
      
      await apiClient.delete<any>(`/auth/roles/${id}`, undefined, headers);
      
      // Refresh the role list
      await fetchRoles(undefined, headers);
      setLoading(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete role';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },
  
  assignRoleToUser: async (userId: string, roleData: { role: string; display_name: string }, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError } = get();
    try {
      setActiveAction('update');
      setLoading(true);
      
      await apiClient.post<any>(`/auth/roles/users/${userId}/roles`, roleData, headers);
      setLoading(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign role to user';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },
  
  removeRoleFromUser: async (userId: string, role: string, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError } = get();
    try {
      setActiveAction('update');
      setLoading(true);
      
      await apiClient.delete<any>(`/auth/roles/users/${userId}/roles/${role}`, undefined, headers);
      setLoading(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove role from user';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },
  
  // Local filtering for UI
  getFilteredRoles: () => {
    const { roles, searchQuery } = get();
    
    return roles.filter(role => {
      // Get the appropriate name field
      const roleName = role.name || role.display_name || role.role || '';
      const roleDescription = role.description || '';
      
      // Filter by search query
      const matchesSearch = 
        roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        roleDescription.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }
})
);
