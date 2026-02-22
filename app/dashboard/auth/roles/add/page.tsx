"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRoleStore } from '@/features/auth/stores/role-store';
import { RoleForm, RoleFormValues } from '@/features/auth/components/role-form';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { ErrorCard } from '@/components/ui/error-card';

export default function AddRolePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const tenantId = session?.user?.tenant_id;

  const {
    createRole,
    fetchAvailablePermissions,
    permissions: availablePermissions,
    loading: storeLoading,
    storeError,
  } = useRoleStore();

  const [isSubmitting, setIsSubmitting] = useState(false);



  const handleRetry = () => {
    if (tenantId) {
      fetchAvailablePermissions({ 'X-Tenant-ID': tenantId });
    }
  };

  useEffect(() => {
    // Fetch permissions only if they haven't been fetched and are not currently loading.
    if (tenantId && availablePermissions.length === 0 && !storeLoading) {
      fetchAvailablePermissions({ 'X-Tenant-ID': tenantId }).catch(error => {
        // The store already handles setting the error state.
        // We just need to prevent an unhandled rejection crash.
      });
    }
  }, [tenantId, availablePermissions.length, fetchAvailablePermissions, storeLoading]);

  const handleSubmit = async (values: RoleFormValues) => {
    if (!tenantId) {
      toast.error('Tenant ID is missing. Cannot create role.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRole(values, { 'X-Tenant-ID': tenantId });
      toast.success('Role created successfully!');
      router.push('/dashboard/auth/roles');
    } catch (error) {
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to create role.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = storeLoading && availablePermissions.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 md:p-6">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Role</h1>
          <p className="text-muted-foreground">Fill in the details to create a new user role.</p>
        </div>
      </div>
      <Separator />

      {isLoading ? (
          <Spinner />
      ) : storeError && availablePermissions.length === 0 ? (
        <ErrorCard
          title="Failed to load permissions"
          error={{ ...storeError, status: storeError.status ? String(storeError.status) : undefined }}
          buttonText="Retry"
          buttonAction={handleRetry}
          buttonIcon={RefreshCcw}
        />
      ) : (
        <div className='p-4 md:p-6'>
          <RoleForm
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
            availablePermissions={availablePermissions || []}
          />
        </div>
      )}
    </div>
  );
}
