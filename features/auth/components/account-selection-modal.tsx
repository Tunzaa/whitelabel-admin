"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";

export interface UserAccount {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
  active_profile_role: string;
  profiles: Array<{
    profile_id: string;
    role: string;
    display_name?: string | null;
    is_active: boolean;
  }>;
  roles: Array<{
    role: string;
    description?: string;
  }>;
  tenant_id?: string | null;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface AccountSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  onSelectAccount: (account: UserAccount) => Promise<void>;
}

interface TenantInfo {
  tenant_id: string;
  name: string;
}

export function AccountSelectionModal({
  isOpen,
  onClose,
  accounts,
  onSelectAccount,
}: AccountSelectionModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantMap, setTenantMap] = useState<Record<string, TenantInfo>>({});
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  const handleSelect = async (account: UserAccount) => {
    setSelectedId(account.user_id);
    setIsLoading(true);
    try {
      await onSelectAccount(account);
    } finally {
      setIsLoading(false);
      setSelectedId(null);
    }
  };

  // Fetch tenant details for accounts with tenant_ids
  const fetchTenantDetails = useCallback(async () => {
    const tenantIds = accounts
      .map((a) => a.tenant_id)
      .filter((id): id is string => !!id && id !== "null" && id !== "undefined");

    if (tenantIds.length === 0) return;

    const uniqueTenantIds = [...new Set(tenantIds)];
    setIsLoadingTenants(true);

    try {
      const tenantPromises = uniqueTenantIds.map(async (tenantId) => {
        try {
          const response = await apiClient.get(`/tenants/${tenantId}`);
          const tenantData = (response.data as any)?.data || response.data;
          return {
            tenant_id: tenantId,
            name: tenantData?.name || "Unknown Tenant",
          };
        } catch (error) {
          console.error(`Failed to fetch tenant ${tenantId}:`, error);
          return {
            tenant_id: tenantId,
            name: "Unknown Tenant",
          };
        }
      });

      const tenants = await Promise.all(tenantPromises);
      const tenantMapResult: Record<string, TenantInfo> = {};
      tenants.forEach((tenant) => {
        tenantMapResult[tenant.tenant_id] = tenant;
      });
      setTenantMap(tenantMapResult);
    } catch (error) {
      console.error("Error fetching tenant details:", error);
    } finally {
      setIsLoadingTenants(false);
    }
  }, [accounts]);

  // Fetch tenants when modal opens or accounts change
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      fetchTenantDetails();
    }
  }, [isOpen, accounts, fetchTenantDetails]);

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "super":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "vendor":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "buyer":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "support":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold">
              Select Account
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Multiple accounts found for these credentials. Choose which one to access.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Account List */}
        <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
          {accounts.map((account, index) => {
            const isSelected = selectedId === account.user_id;
            const isProcessing = isLoading && isSelected;

            // Get display name: prefer profile display_name, fallback to first_name + last_name
            const activeProfile = account.profiles?.find(p => p.is_active);
            const profileDisplayName = activeProfile?.display_name;
            const displayName = profileDisplayName && profileDisplayName !== "null" && profileDisplayName !== "undefined"
              ? profileDisplayName
              : `${account.first_name || ""} ${account.last_name || ""}`.trim() || "Unknown User";

            // Get initials for avatar
            const initials = displayName
              .split(" ")
              .map(n => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            // Get all unique roles from both roles array and profiles
            const roleSet = new Set<string>();
            account.roles?.forEach(r => r?.role && roleSet.add(r.role));
            account.profiles?.forEach(p => p?.role && roleSet.add(p.role));
            if (account.active_profile_role) roleSet.add(account.active_profile_role);
            const allRoles = Array.from(roleSet);

            return (
              <button
                key={account.user_id}
                disabled={isLoading}
                onClick={() => handleSelect(account)}
                className={cn(
                  "w-full text-left rounded-xl p-3 transition-all duration-200",
                  "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "border-2",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-transparent hover:border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with Initials */}
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-semibold text-sm",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      initials
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.email}
                    </p>

                    {/* Badges Row */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {/* Primary Role */}
                      {allRoles[0] && (
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] px-1.5 py-0 h-4", getRoleBadgeColor(allRoles[0]))}
                        >
                          {allRoles[0]}
                        </Badge>
                      )}

                      {/* Additional Roles Count */}
                      {allRoles.length > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          +{allRoles.length - 1} more
                        </Badge>
                      )}

                      {/* Tenant */}
                      {account.tenant_id && account.tenant_id !== "null" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800"
                        >
                          <Building2 className="h-3 w-3" />
                          {isLoadingTenants
                            ? "..."
                            : tenantMap[account.tenant_id]?.name || "Marketplace"
                          }
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        {/* <div className="px-6 py-4 bg-muted/30 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </div> */}
      </DialogContent>
    </Dialog>
  );
}
