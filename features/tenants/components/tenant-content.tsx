"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TenantTable } from "./tenant-table";
import { useTenantStore } from "../store";
import { Tenant } from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { useDebounce } from "@/hooks/use-debounce";

export function TenantContent() {
  const router = useRouter();
  const {
    tenants,
    loading,
    storeError,
    fetchTenants,
    updateTenant,
  } = useTenantStore();
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  
  // Use debounced search to prevent excessive filtering
  const searchQuery = useDebounce(searchText, 300);

  // Track if data has been loaded at least once
  const [dataEverLoaded, setDataEverLoaded] = useState(false);
  
  // Fetch tenants only once when component mounts (skip cache for fresh data)
  useEffect(() => {
    // Only fetch if data has never been loaded
    if (!dataEverLoaded && tenants.length === 0) {
      const loadTenants = async () => {
        try {
          await fetchTenants({}, true); // skipCache=true for fresh data
          setDataEverLoaded(true);
        } catch (error) {
        }
      };
      
      loadTenants();
    } else if (tenants.length > 0 && !dataEverLoaded) {
      // Mark as loaded if we already have data
      setDataEverLoaded(true);
    }
  }, [fetchTenants, dataEverLoaded, tenants.length]);

  // Handle activation/deactivation with loading state management
  const handleActivateTenant = useCallback(async (tenantId: string) => {
    try {
      // Update the tenant and get the response
      const updatedTenant = await updateTenant(tenantId, { is_active: true });
      
      // Update the tenant in the local state without a full API refetch
      const updatedTenants = tenants.map(t => 
        t.id === tenantId ? { ...t, is_active: true } : t
      );
      
      // Set the updated tenants array
      useTenantStore.getState().setTenants(updatedTenants);
      
      toast.success("Tenant activated successfully");
    } catch (error) {
      toast.error("Failed to activate tenant");
    }
  }, [updateTenant, tenants]);

  const handleDeactivateTenant = useCallback(async (tenantId: string) => {
    try {
      // Update the tenant and get the response
      const updatedTenant = await updateTenant(tenantId, { is_active: false });
      
      // Update the tenant in the local state without a full API refetch
      const updatedTenants = tenants.map(t => 
        t.id === tenantId ? { ...t, is_active: false } : t
      );
      
      // Set the updated tenants array
      useTenantStore.getState().setTenants(updatedTenants);
      
      toast.success("Tenant deactivated successfully");
    } catch (error) {
      toast.error("Failed to deactivate tenant");
    }
  }, [updateTenant, tenants]);

  // Handle retry if there's an error
  const handleRetry = useCallback(() => {
    fetchTenants().catch(() => {
      // Error is already handled by store
    });
  }, [fetchTenants]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  // Memoize filtered tenants to prevent unnecessary filtering on each render
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      // Filter by status
      if (selectedStatus !== "all" && tenant.is_active !== (selectedStatus === "active"))
        return false;
      
      // Filter by search query
      if (searchQuery && !tenant.name.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
        
      return true;
    });
  }, [tenants, selectedStatus, searchQuery]);

  // Memoize counts to prevent unnecessary calculations
  const counts = useMemo(() => ({
    all: tenants.length,
    active: tenants.filter((t) => t.is_active).length,
    inactive: tenants.filter((t) => !t.is_active).length,
  }), [tenants]);
  
  // Show spinner during initial loading (only if we've never loaded data)
  if (loading && tenants.length === 0 && !dataEverLoaded) {
    return <Spinner />;
  }
  
  // Show error card ONLY if there's an error AND we've never loaded data successfully
  // This prevents showing timeout errors after data is already displayed
  if (storeError && !loading && !tenants) {
    return (
      <ErrorCard
        title="Error loading tenants"
        error={{ status: storeError.status?.toString() || "Error", message: storeError.message }}
        buttonText="Retry"
        buttonAction={handleRetry}
        buttonIcon={RefreshCw}
      />
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col gap-4">
        <div className="relative w-full mx-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tenants..."
            className="pl-8 w-full md:w-[250px]"
            value={searchText}
            onChange={handleSearchChange}
          />
        </div>

        <div className="px-4 pt-2">
          <Tabs
            defaultValue="all"
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="all">
                All Tenants ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({counts.active})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive ({counts.inactive})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <TenantTable
                tenants={filteredTenants}
                onActivateTenant={handleActivateTenant}
                onDeactivateTenant={handleDeactivateTenant}
                isLoading={loading && dataEverLoaded} 
              />
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              <TenantTable
                tenants={filteredTenants}
                onActivateTenant={handleActivateTenant}
                onDeactivateTenant={handleDeactivateTenant}
                isLoading={loading && dataEverLoaded}
              />
            </TabsContent>

            <TabsContent value="inactive" className="space-y-4">
              <TenantTable
                tenants={filteredTenants}
                onActivateTenant={handleActivateTenant}
                onDeactivateTenant={handleDeactivateTenant}
                isLoading={loading && dataEverLoaded}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
