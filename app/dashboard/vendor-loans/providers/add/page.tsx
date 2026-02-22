"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { ProviderForm } from "@/features/loans/providers/components/provider-form";
import { useLoanProviderStore } from "@/features/loans/providers/store";
import { LoanProviderFormValues } from "@/features/loans/providers/types";

export default function AddLoanProviderPage() {
  const router = useRouter();
  const session = useSession();
  const tenantId = session?.data?.user?.tenant_id;
  const { createProvider, loading } = useLoanProviderStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: LoanProviderFormValues) => {
    try {
      setSubmitting(true);
      const headers = {
        'X-Tenant-ID': tenantId || ''
      };

      await createProvider(values, headers);

      toast({
        title: "Success",
        description: "Loan provider created successfully",
        variant: "success",
      });

      router.push("/dashboard/vendor-loans/providers");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create loan provider",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const initialValues: LoanProviderFormValues = {
    tenant_id: tenantId || '',
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    address: '',
    is_active: true,
    integration_key: '',
    integration_secret: '',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b">
        <Button
          variant="ghost"
          className="mr-2"
          onClick={() => router.push("/dashboard/vendor-loans/providers")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Loan Provider</h1>
          <p className="text-muted-foreground">
            Create a new loan provider in the system
          </p>
        </div>
      </div>

      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Provider Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ProviderForm
              initialValues={initialValues}
              onSubmit={handleSubmit}
              isSubmitting={submitting || loading}
              submitLabel="Create Provider"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
