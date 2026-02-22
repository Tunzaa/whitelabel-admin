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
import { LoanProductFormValues } from "@/features/loans/products/types";

export default function AddLoanProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const tenantId = session?.data?.user?.tenant_id;

  const { createProduct, loading: productLoading } = useLoanProductStore();
  const { providers, fetchProviders, loading: providersLoading } = useLoanProviderStore();

  const [submitting, setSubmitting] = useState(false);
  const providerId = searchParams.get('provider');

  // Define tenant headers
  const tenantHeaders = {
    'X-Tenant-ID': tenantId || ''
  };

  useEffect(() => {
    const loadProviders = async () => {
      try {
        await fetchProviders({ is_active: true }, tenantHeaders);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load loan providers",
          variant: "destructive",
        });
      }
    };

    loadProviders();
  }, [fetchProviders]);

  const handleSubmit = async (values: LoanProductFormValues) => {
    try {
      setSubmitting(true);
      await createProduct(values, tenantHeaders);

      toast({
        title: "Success",
        description: "Loan product created successfully",
        variant: "success",
      });

      // If there was a providerId in the URL, redirect back to that provider's details
      if (providerId) {
        router.push(`/dashboard/vendor-loans/providers/${providerId}`);
      } else {
        router.push("/dashboard/vendor-loans/products");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create loan product",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const initialValues: LoanProductFormValues = {
    tenant_id: tenantId || '',
    provider_id: providerId || '',
    name: '',
    description: '',
    interest_rate: '',
    term_options: [3, 6, 12], // Default term options in months
    payment_frequency: 'monthly',
    min_amount: '',
    max_amount: '',
    processing_fee: '',
    is_active: true,
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
          <h1 className="text-2xl font-bold tracking-tight">Add Loan Product</h1>
          <p className="text-muted-foreground">
            Create a new loan product offered by a provider
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
