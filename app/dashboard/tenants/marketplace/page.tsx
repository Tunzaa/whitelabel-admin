"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Edit, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ErrorCard } from "@/components/ui/error-card";
import { TenantForm } from "@/features/tenants/components/tenant-form";
import { useTenantStore, useSelectedTenantStore } from "@/features/tenants/store";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MarketplacePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";
  const isSuperOwner = userRole === "super";
  
  // Use selectedTenantId from store for super users, fallback to session
  const { selectedTenantId } = useSelectedTenantStore();
  const tenantId = isSuperOwner 
    ? (selectedTenantId || (session?.user as any)?.tenant_id) 
    : (session?.user as any)?.tenant_id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const tenantStore = useTenantStore();
  const { tenant, loading, storeError } = tenantStore;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Fetch tenant data when tenantId is available and doesn't match current store state
    if (tenantId) {
      const isDifferentTenant = tenant && tenant.tenant_id !== tenantId;
      const isMissingData = !tenant && !loading && !storeError;

      if (!hasFetchedRef.current || isDifferentTenant || isMissingData) {
        hasFetchedRef.current = true;

        tenantStore.fetchTenant(tenantId).catch((error) => {
          console.error("Error fetching marketplace tenant:", error);
        });
      }
    }
  }, [tenantId, tenantStore, tenant, loading, storeError]);

  const onSubmit = async (data: Record<string, any>) => {
    console.log("Marketplace form data:", data);
    setIsSubmitting(true);
    try {
      await tenantStore.updateTenant(tenantId, data);
      toast.success("Marketplace settings updated successfully");
      setIsEditing(false);
      const result = { id: tenantId };
      console.log('[MarketplacePage] Returning result to TenantForm:', result);
      return result; // <-- Return the correct tenantId
    } catch (error) {
      console.error("Error updating marketplace settings:", error);
      toast.error("Failed to update marketplace settings. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (loading && !isSubmitting) {
    return <Spinner />;
  }

  if (!tenantId && isSuperOwner) {
    router.push("/dashboard/tenants");
    return;
  }

  // Error handling consistent with tenant edit page
  if (!loading && storeError && !tenant) {
    return (
      <ErrorCard
        title="Error Loading Marketplace"
        error={{
          message: storeError?.message || "Failed to load marketplace settings",
          status: storeError?.status ? String(storeError.status) : "error",
        }}
        buttonText="Back to Dashboard"
        buttonAction={() => router.push("/dashboard")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  return tenant ? (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Marketplace Settings
            </h1>
            <p className="text-muted-foreground">
              Customize your marketplace appearance and functionality
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="marketplace-tenant-form"
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner size="sm" color="white" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Customize Marketplace
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        {!isEditing && (
          <Alert className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-blue-50 text-blue-900 text-sm border border-blue-200">
            <Info className="h-4 w-4 text-blue-500" />
            Marketplace settings are <strong>read only.</strong> Click <strong className="flex items-center"><Edit className="mr-1 h-4 w-4" />Customize Marketplace</strong> to allow changes.
          </Alert>
        )}
        {tenant && (
          <TenantForm
            initialData={{
              ...tenant,
              tenant_id: typeof tenant.tenant_id === 'string' ? tenant.tenant_id : tenant.id,
              plan: tenant.plan === 'monthly' || tenant.plan === 'quarterly' || tenant.plan === 'annually' ? tenant.plan : undefined,
              banners: tenant.banners === null ? [] : tenant.banners,
              branding: {
                ...tenant.branding,
                logoUrl: tenant.branding?.logoUrl === null ? undefined : tenant.branding?.logoUrl,
                theme: {
                  ...tenant.branding?.theme,
                  logo: {
                    primary: tenant.branding?.theme?.logo?.primary === null ? undefined : tenant.branding?.theme?.logo?.primary,
                    secondary: tenant.branding?.theme?.logo?.secondary === null ? undefined : tenant.branding?.theme?.logo?.secondary,
                    icon: tenant.branding?.theme?.logo?.icon === null ? undefined : tenant.branding?.theme?.logo?.icon,
                  },
                },
              },
            }}
            onSubmit={onSubmit}
            onCancel={handleCancelEdit}
            isEditable={isEditing}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  ) : null;
}
