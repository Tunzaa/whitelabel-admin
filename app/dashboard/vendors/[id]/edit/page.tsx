"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { VendorForm } from "@/features/vendors/components/vendor-form";
import { useVendorStore } from "@/features/vendors/store";
import { VendorFormValues, Vendor } from "@/features/vendors/types";
import { withAuthorization } from "@/components/auth/with-authorization";

interface VendorEditPageProps {
  params: {
    id: string;
  };
}

function VendorEditPage({ params }: VendorEditPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    vendor,
    loading,
    error,
    fetchVendor,
    updateVendor,
    updateStore
  } = useVendorStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const vendorId = params.id;
  const tenantId = (session?.user as any)?.tenant_id;

  useEffect(() => {
    if (vendorId) {
      const headers = tenantId ? { 'x-tenant-id': tenantId } : undefined;
      fetchVendor(vendorId, headers);
    }
  }, [vendorId, tenantId, fetchVendor]);

  const handleSubmit = async (data: VendorFormValues) => {
    setIsSubmitting(true);
    try {
      const headers = tenantId ? { 'X-Tenant-ID': tenantId } : undefined;
      const updatedVendor = await updateVendor(vendorId, data, headers);

      if (updatedVendor) {
        const storeToUpdate = data.stores?.[0];
        if (storeToUpdate && storeToUpdate.store_id) {
          try {
            const randomSlug = Math.random().toString(36).substring(2, 10);
            const storeUpdatePayload = {
              ...storeToUpdate,
              store_slug: storeToUpdate.store_slug || randomSlug,
              branding: {
                ...data.stores?.[0].branding,
                "colors": {
                  "primary": "#4285F4",
                  "secondary": "#34A853",
                  "accent": "#FBBC05",
                  "text": "#333333",
                  "background": "#FFFFFF"
                }
              },
            };
            await updateStore(storeToUpdate.store_id, storeUpdatePayload, headers);
            toast.success("Vendor and store updated successfully!");

            await new Promise((resolve) => setTimeout(resolve, 3000));
            router.push(`/dashboard/vendors/${vendorId}`);
          } catch (storeError) {
            console.error("Store update failed after vendor update:", storeError);
            toast.warning("Vendor details were updated, but the store update failed.");
          }
        } else {
          toast.success("Vendor updated successfully!");
        }
      } else {
        toast.error(error?.message || "Failed to update vendor. Please try again.");
      }
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : "An unknown error occurred";
      toast.error(`Failed to update vendor: ${errorMessage}`);
      console.error("Update vendor error:", apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !vendor) {
    return (
      <Spinner />
    );
  }

  if (error && !vendor) {
    return (
      <ErrorCard
        title="Failed to load vendor"
        error={{
          status: error.status?.toString() || "Error",
          message: error.message || "An unexpected error occurred."
        }}
        buttonText="Back to Vendors"
        buttonAction={() => router.push("/dashboard/vendors")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  return vendor ? (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/vendors/${vendorId}`)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Edit Vendor: {vendor.business_name}
            </h1>
            <p className="text-muted-foreground">
              Update vendor information and settings
            </p>
          </div>
        </div>
        <Button
          type="submit"
          form="marketplace-vendor-form"
          disabled={isSubmitting || loading}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Updating...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <VendorForm
          onSubmit={handleSubmit}
          initialData={vendor as VendorFormValues}
          isSubmitting={isSubmitting}
          onCancel={() => router.push(`/dashboard/vendors/${vendorId}`)}
        />
      </div>
    </div>
  ) : null;
}

export default withAuthorization(VendorEditPage, { permission: "vendor:update" });
