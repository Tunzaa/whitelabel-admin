"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AffiliateForm } from "@/features/affiliates/components";
import { useAffiliateStore } from "@/features/affiliates/store";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";
import { withAuthorization } from "@/components/auth/with-authorization";
import { withModuleAuthorization } from "@/components/auth/with-module-authorization";

function AddAffiliatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { createAffiliate, setActiveAction, setError, loading } =
    useAffiliateStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setActiveAction("create");
    try {
      const tenant_id = (session?.user as any)?.tenant_id;
      const payload = { ...values, tenant_id };
      const headers = { "X-Tenant-ID": tenant_id };
      const created = await createAffiliate(payload, headers);
      if (created) {
        setError(null);
        toast.success("Affiliate created successfully!");
        router.push(`/dashboard/affiliates/${created.user_id}`);
      } else {
        toast.error("Failed to create affiliate.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create affiliate.";
      setError({ message: errorMessage, details: error, action: "create" });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/affiliates`)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add Affiliate</h1>
            <p className="text-muted-foreground">
              Add a new affiliate to your marketplace
            </p>
          </div>
        </div>
        <Button
          type="submit"
          form="marketplace-affiliate-form"
          disabled={isSubmitting || loading}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Adding...
            </>
          ) : (
            "Create Affiliate"
          )}
        </Button>
      </div>

      <div className="p-4">
        <AffiliateForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting || loading}
        />
      </div>
    </div>
  );
}

export default withModuleAuthorization(withAuthorization(AddAffiliatePage, { 
  permission: "affiliate:create" 
}), "affiliates");
