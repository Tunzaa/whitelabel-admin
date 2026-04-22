"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { toast } from "sonner";

import { ProductForm } from "@/features/loans/products/components/product-form";
import { useLoanProductStore } from "@/features/loans/products/store";
import { useLoanProviderStore } from "@/features/loans/providers/store";
import { LoanProductFormValues } from "@/features/loans/products/types";

interface EditLoanProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditLoanProductPage(props: EditLoanProductPageProps) {
  const params = use(props.params) as { id: string };
  const { id } = params;
  const router = useRouter();
  const session = useSession();
  const tenantId = (session?.data?.user as any)?.tenant_id;

  const {
    product,
    loading: productLoading,
    storeError: productError,
    fetchProduct,
    updateProduct
  } = useLoanProductStore();

  const { providers, fetchProviders, loading: providersLoading } = useLoanProviderStore();

  const [submitting, setSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<LoanProductFormValues | null>(null);

  // Define tenant headers
  const tenantHeaders = {
    'X-Tenant-ID': tenantId || ''
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchProduct(id, tenantHeaders),
          fetchProviders({ is_active: true }, tenantHeaders)
        ]);
      } catch (error) {
        toast.error("Failed to load required data");
      }
    };

    fetchData();
  }, [fetchProduct, fetchProviders, id]);

  useEffect(() => {
    if (product) {
      setInitialValues({
        tenant_id: product.tenant_id || '',
        provider_id: product.provider_id,
        name: product.name,
        description: product.description || '',
        interest_rate: product.interest_rate,
        interest_period: product.interest_period,
        interest_rate_type: product.interest_rate_type,
        term_duration: product.term_duration,
        term_unit: product.term_unit,
        repayment_frequency: product.repayment_frequency,
        min_amount: product.min_amount,
        max_amount: product.max_amount,
        processing_fee: product.processing_fee,
        is_active: product.is_active || product.status === 'ACTIVE',
        charges: product.charges || {},
      });
    }
  }, [product]);

  const handleSubmit = async (values: LoanProductFormValues) => {
    try {
      setSubmitting(true);
      await updateProduct(id, values, tenantHeaders);

      toast.success("Loan product updated successfully");

      router.push(`/dashboard/vendor-loans/products/${id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update loan product");
    } finally {
      setSubmitting(false);
    }
  };

  if ((productLoading || providersLoading) && !initialValues) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => router.push(`/dashboard/vendor-loans/products/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Loan Product</h1>
            <p className="text-muted-foreground">
              Update an existing loan product
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!product && !productLoading && productError) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => router.push("/dashboard/vendor-loans/products")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Loan Product</h1>
            <p className="text-muted-foreground">
              Update an existing loan product
            </p>
          </div>
        </div>

        <div className="p-4">
          <ErrorCard
            title="Failed to load product"
            error={{
              status: productError.status?.toString() || "Error",
              message: productError.message || "An error occurred"
            }}
            buttonText="Go Back"
            buttonAction={() => router.push("/dashboard/vendor-loans/products")}
            buttonIcon={ArrowLeft}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b">
        <Button
          variant="ghost"
          className="mr-2"
          onClick={() => router.push(`/dashboard/vendor-loans/products/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Loan Product</h1>
          <p className="text-muted-foreground">
            Update an existing loan product
          </p>
        </div>
      </div>

      <div className="p-4">
        {initialValues && providers ? (
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductForm
                initialValues={initialValues}
                onSubmit={handleSubmit}
                isSubmitting={submitting || productLoading}
                submitLabel="Update Product"
                providers={providers}
                defaultProviderId={initialValues.provider_id}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
}
