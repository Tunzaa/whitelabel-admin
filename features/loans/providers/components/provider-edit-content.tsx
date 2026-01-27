'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderForm } from './provider-form';
import { useLoanProviderStore } from '../store';
import { LoanProvider } from '../types';

interface ProviderEditContentProps {
  providerId: string;
}

export function ProviderEditContent({ providerId }: ProviderEditContentProps) {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  const {
    provider,
    loading,
    storeError,
    fetchProvider,
    updateProvider,
  } = useLoanProviderStore();

  useEffect(() => {
    const loadProvider = async () => {
      await fetchProvider(providerId);
      setIsLoaded(true);
    };

    loadProvider();
  }, [providerId, fetchProvider]);

  const handleUpdateProvider = async (values: any) => {
    await updateProvider(providerId, values);
    router.push('/dashboard/vendor-loans/providers');
  };

  const handleCancel = () => {
    router.push('/dashboard/vendor-loans/providers');
  };

  if (!isLoaded) {
    return null; // Let Suspense handle loading state
  }

  if (storeError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{storeError}</p>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="mt-4"
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!provider) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Provider Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not find the provider you're looking for.</p>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="mt-4"
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleCancel}
        variant="outline"
        className="flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Providers</span>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Provider: {provider.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProviderForm
            initialValues={provider}
            onSubmit={handleUpdateProvider}
            isSubmitting={loading}
            submitLabel="Update Provider"
          />
        </CardContent>
      </Card>
    </div>
  );
}
