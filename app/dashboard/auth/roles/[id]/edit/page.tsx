'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRoleStore } from '@/features/auth/stores/role-store';
import { RoleForm, RoleFormValues } from '@/features/auth/components/role-form';
import { Spinner } from '@/components/ui/spinner';
import { ErrorCard } from '@/components/ui/error-card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Permission } from '@/features/auth/types/role';
import { ArrowLeft } from 'lucide-react';

const EditRolePage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const tenantId = session?.user?.tenant_id;
  const decodedId = useMemo(() => id ? decodeURIComponent(id as string) : '', [id]);

  const {
    roles,
    permissions,
    loading,
    fetchRoles,
    fetchAvailablePermissions,
    updateRole,
  } = useRoleStore();

  useEffect(() => {
    const headers = { 'X-Tenant-ID': tenantId };
    if (tenantId) {
      if (roles.length === 0) {
        fetchRoles(undefined, headers).catch(err => {
        });
      }
      fetchAvailablePermissions(headers).catch(err => {
      });
    }
  }, [tenantId, roles.length, fetchRoles, fetchAvailablePermissions]);

  const roleToEdit = useMemo(() => {
    if (!decodedId || roles.length === 0) return undefined;
    return roles.find(r => r.role === decodedId);
  }, [roles, decodedId]);

  const handleSubmit = async (data: RoleFormValues) => {
    if (!tenantId || !roleToEdit?.role) return;
    const headers = { 'X-Tenant-ID': tenantId };
    
    const promise = updateRole(roleToEdit.role, data, headers);

    toast.promise(promise, {
      loading: 'Updating role...',
      success: (updatedRole) => {
        router.push(`/dashboard/auth/roles`);
        return `Role '${updatedRole.role}' updated successfully.`;
      },
      error: 'Failed to update role.',
    });
  };

  const combinedPermissions = useMemo(() => {
    const rolePermissions = roleToEdit?.permissions?.map((p: Permission | string) => typeof p === 'string' ? p : p.name) || [];
    const availablePermissions = permissions || [];
    return [...new Set([...availablePermissions, ...rolePermissions])];
  }, [roleToEdit, permissions]);

  const isLoading = loading && roles.length === 0;

  if (isLoading && !roleToEdit) {
    return <Spinner />;
  }

  if (!loading && !roleToEdit) {
    return (
      <ErrorCard 
        title="Role Not Found"
        error={{ message: `A role with the name '${decodedId}' could not be found.`, status: '404' }}
        buttonText="Back to Roles"
        buttonAction={() => router.push('/dashboard/auth/roles')}
        buttonIcon={ArrowLeft}
      />
    );
  }

  return roleToEdit ? (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 md:p-6">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-lg font-medium">Edit Role</h1>
          <p className="text-sm text-muted-foreground">
            Update the details for the role: {roleToEdit.role}.
          </p>
        </div>
      </div>
      <Separator />
      <div className='p-4 md:p-6'>
        <RoleForm
          initialData={roleToEdit}
          onSubmit={handleSubmit}
          isLoading={loading}
          availablePermissions={combinedPermissions}
        />
      </div>
    </div>
  ) : null;
};

export default EditRolePage;


