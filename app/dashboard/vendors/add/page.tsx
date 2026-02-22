"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { useVendorStore } from "@/features/vendors/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VendorForm } from "@/features/vendors/components/vendor-form";
import { VendorFormValues } from "@/features/vendors/types";
import { withAuthorization } from "@/components/auth/with-authorization";

function VendorAddPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const vendorStore = useVendorStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateVendor = async (data: VendorFormValues) => {
    setIsSubmitting(true);
    try {
      const tenantId = (session?.user as any)?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant ID is missing. Cannot create vendor.");
        setIsSubmitting(false);
        return;
      }

      const headers = { "X-Tenant-ID": tenantId };

      // The form data is now in the unified format, including the 'stores' array.
      // We just pass it directly to the store's create method.

      const randomSlug = Math.random().toString(36).substring(2, 10); // TODO: temp
      const payload: VendorFormValues = {
        ...data,
        tenant_id: data.tenant_id || tenantId,
        // stores: [
        //   {
        //     ...data.stores?.[0],
        //     store_slug: randomSlug,
        //     branding: {
        //         ...data.stores?.[0].branding,
        //         "colors": {
        //             "primary": "#4285F4",
        //             "secondary": "#34A853",
        //             "accent": "#FBBC05",
        //             "text": "#333333",
        //             "background": "#FFFFFF"
        //         }
        //     },
        //   },
        //   ...data.stores?.slice(1) ?? [],
        // ],
        store: {
          ...data.stores?.[0],
          store_slug: randomSlug,
          branding: {
            ...data.stores?.[0].branding,
            colors: {
              primary: "#4285F4",
              secondary: "#34A853",
              accent: "#FBBC05",
              text: "#333333",
              background: "#FFFFFF",
            },
          },
        },
      };


      const newVendor = await vendorStore.createVendor(payload, headers);

      if (newVendor?.vendor_id) {
        toast.success("Vendor created successfully!");
        router.push(`/dashboard/vendors/${newVendor.vendor_id}`);
      } else {
        toast.error("Failed to create vendor. Please try again.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Failed to create vendor: ${errorMessage}`);
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
            onClick={() => router.push("/dashboard/vendors")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Add New Vendor
            </h1>
            <p className="text-muted-foreground">
              Create a new vendor account and store
            </p>
          </div>
        </div>
        <Button
          type="submit"
          form="marketplace-vendor-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" color="white" />
              Creating...
            </>
          ) : (
            <>Save Vendor</>
          )}
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <VendorForm
          onSubmit={handleCreateVendor}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/vendors")}
        />
      </div>
    </div>
  );
}

export default withAuthorization(VendorAddPage, {
  permission: "vendors:create",
});
