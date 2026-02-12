"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { useTenantStore } from "@/features/tenants/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TenantForm } from "@/features/tenants/components/tenant-form";
import { withAuthorization } from "@/components/auth/with-authorization";

function TenantAddPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const tenantStore = useTenantStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // Ensure we have user_id from session or fallback to default
      const tenantData = {
        ...data,
        // user_id: session?.user?.id || "13c94ad0-1071-431a-9d59-93eeee25ca0a",
      };

      const newTenant = await tenantStore.createTenant(tenantData);

      toast.success("Tenant created successfully");

      // Navigate to the tenant details page for the newly created tenant
      if (newTenant && newTenant.tenant_id) {
        return { id: newTenant.tenant_id }; // <-- Return the backend response
        router.push(`/dashboard/tenants/${newTenant.tenant_id}`);
      }
    } catch (error) {
      console.error("Error creating tenant:", error);
      toast.error("Failed to create tenant. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/tenants")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Add New Tenant
            </h1>
            <p className="text-muted-foreground">
              Create a new tenant account and configurations
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
              <Spinner size="sm" color="white" />
              Creating...
            </>
          ) : (
            <>Save Tenant</>
          )}
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <TenantForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}

export default withAuthorization(TenantAddPage, {
  permission: "tenants:create",
});
