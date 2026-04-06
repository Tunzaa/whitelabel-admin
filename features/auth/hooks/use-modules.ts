"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import useAuthStore from '../store';
import { useSelectedTenantStore } from '@/features/tenants/store';
import { useTenantStore } from '@/features/tenants/store';
import { isModuleEnabled as checkModuleEnabled, platformModules } from '@/features/settings/data/modules';
import { setCachedModules, getCachedModules, clearCache } from '@/lib/cache';

/**
 * Custom hook to check if modules are enabled for the current tenant.
 * Provides a stable interface to check module enablement.
 *
 * @returns An object with:
 *  - `isModuleEnabled`: A function to check if a specific module is enabled.
 *  - `enabledModules`: An array of all enabled modules.
 *  - `isLoading`: A boolean indicating if tenant data is being loaded.
 *  - `currentTenantId`: The current tenant ID being used.
 */
export const useModules = () => {
  const [currentTenantModules, setCurrentTenantModules] = useState<Record<string, boolean> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const user = useAuthStore((state) => state.user);
  const { hasRole } = useAuthStore.getState();
  const { selectedTenantId } = useSelectedTenantStore();
  const { fetchTenant, tenant: storedTenant, loading: tenantLoading } = useTenantStore();

  // Track previous tenant to clear cache when switching
  const prevTenantRef = useRef<string | null>(null);

  // Determine the current tenant ID
  const currentTenantId = useMemo(() => {
    if (hasRole('super') && selectedTenantId) {
      return selectedTenantId;
    }
    return user?.tenant_id || null;
  }, [hasRole, selectedTenantId, user?.tenant_id]);

  // Clear cache when tenant changes
  useEffect(() => {
    if (prevTenantRef.current && prevTenantRef.current !== currentTenantId) {
      // Tenant changed, clear cache for old tenant
      clearCache('modules', prevTenantRef.current);
    }
    prevTenantRef.current = currentTenantId;
  }, [currentTenantId]);

  // Fetch tenant data when tenantId changes
  useEffect(() => {
    if (!currentTenantId) {
      setCurrentTenantModules(null);
      return;
    }

    // Check persistent cache first
    const cachedModules = getCachedModules(currentTenantId);
    if (cachedModules) {
      setCurrentTenantModules(cachedModules);
      return;
    }

    // If we already have the tenant data in store and it's the current one, use it
    if (storedTenant && storedTenant.tenant_id === currentTenantId) {
      const modulesData = storedTenant.modules || {};
      setCurrentTenantModules(modulesData);
      // Cache for future use
      setCachedModules(modulesData, currentTenantId);
      return;
    }

    // Otherwise, fetch the tenant data
    const fetchTenantData = async () => {
      // Don't attempt to fetch if no tenant ID
      if (!currentTenantId) {
        setCurrentTenantModules({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const tenantData = await fetchTenant(currentTenantId);
        const modulesData = tenantData.modules || {};
        setCurrentTenantModules(modulesData);
        // Cache the result
        setCachedModules(modulesData, currentTenantId);
      } catch {
        // Set empty modules instead of crashing
        setCurrentTenantModules({});
        // Don't cache empty data to allow retry on next load
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have a tenant ID and are authenticated
    if (currentTenantId) {
      fetchTenantData();
    } else {
      setCurrentTenantModules({});
      setIsLoading(false);
    }
  }, [currentTenantId, storedTenant, fetchTenant]);

  // Memoize the module check function
  const isModuleEnabled = useCallback((moduleName: string) => {
    // Superusers can access all modules
    if (hasRole('super')) return true;

    if (!currentTenantModules) return false;
    return checkModuleEnabled(currentTenantModules, moduleName);
  }, [currentTenantModules, hasRole]);

  // Get enabled modules
  const enabledModules = useMemo(() => {
    if (!currentTenantModules) return [];
    return Object.keys(currentTenantModules).filter(module => currentTenantModules[module]);
  }, [currentTenantModules, hasRole]);

  return useMemo(() => ({
    isModuleEnabled,
    enabledModules,
    isLoading: isLoading || tenantLoading,
    currentTenantId,
  }), [isModuleEnabled, enabledModules, isLoading, tenantLoading, currentTenantId]);
};
