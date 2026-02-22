"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { AffiliateForm } from "@/features/affiliates/components";
import { useAffiliateStore } from "@/features/affiliates/store";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { withAuthorization } from "@/components/auth/with-authorization";
import { withModuleAuthorization } from "@/components/auth/with-module-authorization";

interface EditAffiliatePageProps {
  params: { id: string };
}

function EditAffiliatePage({ params }: EditAffiliatePageProps) {
  const { data: session } = useSession();
  const { id } = params;
  const router = useRouter();
  const { affiliate, loading, error, fetchAffiliate, updateAffiliate, uploadKycDocuments, setActiveAction, setError } = useAffiliateStore();
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    if (id && !fetchAttempted) {
      setFetchAttempted(true);
      fetchAffiliate(id).catch((error) => {
        // Error handling is already in the store
      });
    }
  }, [id, fetchAffiliate, fetchAttempted]);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setActiveAction("update");
    try {
      const tenant_id = (session?.user as any)?.tenant_id;
      const headers = { "X-Tenant-ID": tenant_id };
      const updated = await updateAffiliate(id, values, headers);
      if (updated) {
        setError(null);
        toast.success("Affiliate updated successfully!");
        router.push(`/dashboard/affiliates/${id}`);
      } else {
        toast.error("Failed to update affiliate.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update affiliate.";
      setError({ message: errorMessage, details: error, action: "update" });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  if (loading && !isSubmitting) {
    return <Spinner />;
  }

  if (fetchAttempted && !loading && !affiliate && error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Edit Vendor Affiliate
            </h1>
            <p className="text-muted-foreground">
              Update information for an existing affiliate
            </p>
          </div>
        </div>

        <div className="p-4">
          <ErrorCard
            title="Failed to load affiliate details"
            error={{
              status: error?.status?.toString() || "Error",
              message: error?.message || "An error occurred",
            }}
            buttonText="Back to Affiliates"
            buttonAction={() => router.push("/dashboard/affiliates")}
            buttonIcon={ArrowLeft}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/affiliates/${id}`)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Edit Affiliate: {affiliate?.name}
            </h1>
            <p className="text-muted-foreground">
              Update information for an existing affiliate
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
              Updating...
            </>
          ) : (
            'Update Affiliate'
          )}
        </Button>
      </div>

      <div className="p-4">
        <AffiliateForm initialData={affiliate || undefined} onSubmit={handleSubmit} isSubmitting={isSubmitting || loading} />
      </div>
    </div>
  );
}

export default withModuleAuthorization(withAuthorization(EditAffiliatePage, { 
  permission: "affiliate:update" 
}), "affiliates");
