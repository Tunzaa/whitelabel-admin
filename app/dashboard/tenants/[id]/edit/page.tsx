"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, SaveAllIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TenantForm } from "@/features/tenants/components/tenant-form";
import { useTenantStore } from "@/features/tenants/store";
import { withAuthorization } from "@/components/auth/with-authorization";

interface TenantEditPageProps {
  params: {
    id: string;
  };
}

function TenantEditPage({ params }: TenantEditPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantStore = useTenantStore();
  const tenantId = params.id;
  const { tenant, loading, storeError } = tenantStore;
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    // Fetch tenant data if not already loaded
    if (!fetchAttempted && tenantId) {
      setFetchAttempted(true);
      tenantStore.fetchTenant(tenantId).catch((error) => {
        console.error("Error fetching tenant:", error);
      });
    }
  }, [tenantId, tenantStore, fetchAttempted]);

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await tenantStore.updateTenant(tenantId, data);
      toast.success("Tenant updated successfully");
      const result = { id: tenantId };
      console.log("[TenantEditPage] Returning result to TenantForm:", result);
      return result; // <-- Return the correct tenantId
    } catch (error) {
      toast.error("Failed to update tenant. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching
  if (loading && !isSubmitting && !tenant) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  // Show error state if fetch failed
  if (!loading && storeError && !tenant) {
    return (
      <ErrorCard
        title="Error Loading Tenant"
        error={{
          message: storeError?.message || "Failed to load tenant",
          status: storeError?.status ? String(storeError.status) : "error",
        }}
        buttonText="Back to Tenants"
        buttonAction={() => router.push("/dashboard/tenants")}
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
              Edit Tenant: {tenant.name}
            </h1>
            <p className="text-muted-foreground">
              Update tenant details and configurations
            </p>
          </div>
        </div>
        <Button
          type="submit"
          form="marketplace-tenant-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              Processing...
            </>
          ) : (
            <>
              <SaveAllIcon className="mr-2" />
              Submit Changes
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        {tenant && (
          <TenantForm
            id="marketplace-tenant-form"
            initialData={{
              ...tenant,
              tenant_id:
                typeof tenant.tenant_id === "string"
                  ? tenant.tenant_id
                  : tenant.id,
              plan:
                tenant.plan === "monthly" ||
                tenant.plan === "quarterly" ||
                tenant.plan === "annually"
                  ? tenant.plan
                  : undefined,
              banners: tenant.banners === null ? [] : tenant.banners,
              branding: {
                ...tenant.branding,
                logoUrl:
                  tenant.branding?.logoUrl === null
                    ? undefined
                    : tenant.branding?.logoUrl,
                theme: {
                  ...tenant.branding?.theme,
                  logo: {
                    primary:
                      tenant.branding?.theme?.logo?.primary === null
                        ? undefined
                        : tenant.branding?.theme?.logo?.primary,
                    secondary:
                      tenant.branding?.theme?.logo?.secondary === null
                        ? undefined
                        : tenant.branding?.theme?.logo?.secondary,
                    icon:
                      tenant.branding?.theme?.logo?.icon === null
                        ? undefined
                        : tenant.branding?.theme?.logo?.icon,
                  },
                },
              },
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  ) : null;
}

export default withAuthorization(TenantEditPage, "tenants:update");
