"use client";

import * as React from "react";
import {
  Check,
  ChevronsUpDown,
  Building2,
  Search,
  X,
  Command,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useTenantStore,
  useSelectedTenantStore,
} from "@/features/tenants/store";
import { usePermissions } from "@/features/auth/hooks/use-permissions";
import useAuthStore from "@/features/auth/store";
import { getCachedData, CACHE_KEYS } from "@/lib/cache";

export function TenantSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { hasRole } = usePermissions();
  const { tenants, fetchTenants, tenant, fetchTenant, loading, setTenants } = useTenantStore();
  const { selectedTenantId, setSelectedTenant } = useSelectedTenantStore();
  const user = useAuthStore((state) => state.user);

  const isSuperUser = hasRole("super");
  const userTenantId = (user as any)?.tenant_id;

  // Track if we've attempted to load tenants (prevents infinite loop)
  const tenantsLoadedRef = React.useRef(false);

  // Reset ref on mount (for page refreshes)
  React.useEffect(() => {
    tenantsLoadedRef.current = false;
  }, []);

  // Load tenants from cache on mount, or fetch if cache is empty
  React.useEffect(() => {
    if (!isSuperUser) {
      // For non-super users, fetch their tenant if not already loaded
      if (userTenantId && !tenant) {
        fetchTenant(userTenantId);
      }
      return;
    }

    // Super user: load tenants once
    if (tenantsLoadedRef.current) return;
    tenantsLoadedRef.current = true;

    const cachedTenants = getCachedData<{ tenants: any[] }>(CACHE_KEYS.TENANTS);
    if (cachedTenants?.tenants && cachedTenants.tenants.length > 0) {
      setTenants(cachedTenants.tenants);
    } else {
      // No cache, fetch from API
      fetchTenants();
    }
  }, [isSuperUser, setTenants, fetchTenants, fetchTenant, userTenantId, tenant]);

  const filteredTenants = React.useMemo(() => {
    if (!searchQuery) return tenants;
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tenant.domain &&
          tenant.domain.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [tenants, searchQuery]);

  const handleTenantSelect = async (id: string | null, name?: string | null) => {
    setSelectedTenant(id, name);
    setOpen(false);

    // Logic for page transition
    if (id === null) {
      router.push("/dashboard");
    } else {
      // Fetch tenant data (will use cache if available)
      await fetchTenant(id);
      // Page content refreshes automatically via key change in layout
    }
  };

  // Find the tenant to display
  const displayTenant = isSuperUser
    ? tenants.find((t) => t.tenant_id === selectedTenantId)
    : tenant;

  // If no tenant found but user has one (for non-super), or just the name from store
  const displayTitle =
    displayTenant?.name ||
    (isSuperUser && !selectedTenantId ? "Global Dashboard" : (userTenantId ? "Loading..." : "No Organization"));

  return (
    <Popover
      open={isSuperUser ? open : false}
      onOpenChange={(val) => {
        if (!isSuperUser) return;
        setOpen(val);
        if (!val) setSearchQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between gap-3 px-3 py-8 hover:bg-sidebar-accent/50 transition-all rounded-none border-b border-sidebar-border group",
            isSuperUser && "cursor-pointer",
            !isSuperUser && "cursor-default hover:bg-transparent",
          )}
        >
          <div className="flex items-center gap-3 truncate text-left">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 transition-colors group-hover:bg-primary/20",
                !displayTenant &&
                  isSuperUser &&
                  "bg-sidebar-primary/20 text-sidebar-primary",
              )}
            >
              {displayTenant ? (
                <span className="font-bold text-sm tracking-tight">
                  {displayTenant.name.substring(0, 2).toUpperCase()}
                </span>
              ) : (
                <Command className="size-5" />
              )}
            </div>
            <div className="flex flex-col gap-0.5 leading-tight truncate">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                {isSuperUser
                  ? displayTenant
                    ? "Super User Context"
                    : "Super User"
                  : "Your Organization"}
              </span>
              <span className="truncate font-bold text-sm text-sidebar-foreground">
                {displayTitle}
              </span>
            </div>
          </div>
          {isSuperUser && (
            <ChevronsUpDown className="size-4 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
          )}
        </Button>
      </PopoverTrigger>
      {isSuperUser && (
        <PopoverContent
          className="w-[calc(var(--sidebar-width)-16px)] p-0 overflow-hidden shadow-2xl border-sidebar-border"
          align="start"
          side="right"
          sideOffset={10}
        >
          <div className="flex flex-col bg-sidebar">
            <div className="flex items-center border-b border-sidebar-border px-3 py-2 bg-sidebar-accent/20">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search tenants..."
                className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
              {!searchQuery && (
                <>
                  <div className="px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Quick Controls
                  </div>
                  <button
                    onClick={() => handleTenantSelect(null)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-md px-2 py-2.5 text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all text-left group",
                      !selectedTenantId && "bg-sidebar-accent/50",
                    )}
                  >
                    <div className="flex size-7 items-center justify-center rounded-md border border-sidebar-border bg-sidebar shrink-0 group-hover:border-primary/50">
                      <X className="size-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold">Global Dashboard</span>
                      <span className="text-[11px] text-muted-foreground">
                        Exit tenant context
                      </span>
                    </div>
                    {!selectedTenantId && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </button>
                  <div className="h-px bg-sidebar-border my-1" />
                </>
              )}

              <div className="px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {searchQuery
                  ? `Search Results (${filteredTenants.length})`
                  : "Switch to Tenant"}
              </div>

              {loading ? (
                <div className="px-2 py-8 text-center">
                  <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <span className="text-xs text-muted-foreground">
                    Fetching tenants...
                  </span>
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="px-2 py-8 text-center text-xs text-muted-foreground italic">
                  No matching tenants found
                </div>
              ) : (
                <div className="grid gap-0.5">
                  {filteredTenants.map((tenant) => {
                    const tId = tenant.tenant_id;
                    const isActive = selectedTenantId === tId;
                    return (
                      <button
                        key={tId}
                        onClick={() => handleTenantSelect(tId, tenant.name)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-md px-2 py-2.5 text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all text-left group",
                          isActive && "bg-sidebar-accent/50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-7 items-center justify-center rounded-md border border-sidebar-border shrink-0 font-bold text-[10px] transition-colors group-hover:border-primary/50",
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-sidebar",
                          )}
                        >
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="font-semibold truncate">
                            {tenant.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate opacity-80">
                            {tenant.domain || "no-domain.com"}
                          </span>
                        </div>
                        {isActive && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
