"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

import { ProductForm } from "@/features/loans/products/components/product-form";
import { useLoanProductStore } from "@/features/loans/products/store";
import { useLoanProviderStore } from "@/features/loans/providers/store";
import { useSelectedTenantStore } from "@/features/tenants/store";
import { LoanProductFormValues } from "@/features/loans/products/types";

export default function AddLoanProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const { selectedTenantId } = useSelectedTenantStore();
  const tenantId = selectedTenantId || (session?.data?.user as any)?.tenant_id;

  const { createProduct, loading: productLoading } = useLoanProductStore();
  const { providers, fetchProviders, loading: providersLoading } = useLoanProviderStore();

  const [submitting, setSubmitting] = useState(false);
  const providerId = searchParams.get('provider');

  // Define tenant headers
  const tenantHeaders = {
    'X-Tenant-ID': tenantId || ''
  };

  const activeProvider = providers?.find(p => p.provider_id === providerId || (p as any).id === providerId);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        await fetchProviders({ is_active: true }, tenantHeaders);
      } catch (error) {
        // Only show error if we're not still waiting for session/tenant
        if (tenantId) {
          toast.error("Failed to load loan providers");
        }
      }
    };

    if (tenantId) {
      loadProviders();
    }
  }, [fetchProviders, tenantId, providerId]);

  const handleSubmit = async (values: LoanProductFormValues) => {
    try {
      setSubmitting(true);
      await createProduct(values, tenantHeaders);

      toast.success("Loan product created successfully");

      // If there was a providerId in the URL, redirect back to that provider's details
      if (providerId) {
        router.push(`/dashboard/vendor-loans/providers/${providerId}`);
      } else {
        router.push("/dashboard/vendor-loans/products");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to create loan product");
    } finally {
      setSubmitting(false);
    }
  };

  const initialValues: LoanProductFormValues = {
    provider_id: providerId || '',
    name: '',
    interest_rate: 0,
    interest_period: 'MONTHLY',
    interest_rate_type: 'REDUCING_BALANCE',
    term_duration: 3,
    term_unit: 'MONTHS',
    repayment_frequency: 'MONTHLY',
    charges: {},
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b">
        <Button
          variant="ghost"
          className="mr-2"
          onClick={() => providerId
            ? router.push(`/dashboard/vendor-loans/providers/${providerId}`)
            : router.push("/dashboard/vendor-loans/products")
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Add Loan Product {activeProvider ? `for ${activeProvider.name}` : ''}
          </h1>
          <p className="text-muted-foreground">
            {activeProvider 
              ? `Creating a new product for ${activeProvider.name}`
              : 'Create a new loan product offered by a provider'
            }
          </p>
        </div>
      </div>

      <div className="p-4">
        {providersLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductForm
                initialValues={initialValues}
                onSubmit={handleSubmit}
                isSubmitting={submitting || productLoading}
                submitLabel="Create Product"
                providers={providers || []}
                defaultProviderId={providerId || ''}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
