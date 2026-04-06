'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusIcon } from 'lucide-react';

import { ProviderTable } from './provider-table';
import { ProviderForm } from './provider-form';
import { useLoanProviderStore } from '../store';
import { useSelectedTenantStore } from '@/features/tenants/store';
import { LoanProvider } from '../types';

export function LoanProvidersContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { selectedTenantId } = useSelectedTenantStore();
  const tenantId = selectedTenantId || (session?.user as any)?.tenant_id || "";
  const userId = (session?.user as any)?.id || (session?.user as any)?.user_id || "";
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<LoanProvider | null>(null);
  
  const {
    providers,
    loading,
    createProvider,
    updateProvider,
    deleteProvider,
    fetchProviders,
  } = useLoanProviderStore();

  React.useEffect(() => {
    fetchProviders(undefined, { "X-Tenant-ID": tenantId });
  }, [fetchProviders, tenantId]);

  const handleAddProvider = async (values: any) => {
    await createProvider(values);
    setIsAddDialogOpen(false);
  };

  const handleEditProvider = async (values: any) => {
    if (currentProvider) {
      await updateProvider(currentProvider.provider_id, values);
      setIsEditDialogOpen(false);
      setCurrentProvider(null);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    await deleteProvider(id);
  };

  const handleEditClick = (provider: LoanProvider) => {
    setCurrentProvider(provider);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Providers List</h2>
          <p className="text-sm text-muted-foreground">
            Manage loan providers and their details
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Provider</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Loan Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <ProviderTable 
            providers={providers} 
            onEdit={handleEditClick}
            onView={(provider) => router.push(`/dashboard/vendor-loans/providers/${provider.provider_id}`)}
          />
        </CardContent>
      </Card>

      {/* Add Provider Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
            <DialogDescription>
              Enter the details of the new loan provider below.
            </DialogDescription>
          </DialogHeader>
          <ProviderForm 
            initialData={{
              tenant_id: tenantId,
              user_id: userId,
              business_name: '',
              description: '',
              contact_email: '',
              contact_phone: '',
              is_active: true,
              website: '',
              address: '',
            }}
            onSubmit={handleAddProvider}
            isSubmitting={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update the provider information below.
            </DialogDescription>
          </DialogHeader>
          {currentProvider && (
            <ProviderForm 
              initialData={currentProvider}
              onSubmit={handleEditProvider}
              isSubmitting={loading}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
