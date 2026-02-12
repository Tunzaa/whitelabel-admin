"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, Search } from "lucide-react"
import { useRoleStore } from "@/features/auth/stores/role-store"
import { Role } from "@/features/auth/types/role"
import { RoleTable } from "@/features/auth/components/role-table"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { RotateCcw } from 'lucide-react';

import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

function RolesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const {
    roles,
    loading,
    storeError,
    deleteRole,
    setSearchQuery,
    getFilteredRoles,
    fetchRoles,
  } = useRoleStore()

  const [activeTab, setActiveTab] = useState<string>("all")
  const tenantId = session?.user?.tenant_id

  // Define tenant headers
  const tenantHeaders = {
    "X-Tenant-ID": tenantId,
  }

  // Fetch roles on component mount
  useEffect(() => {
    const loadRoles = async () => {
      if (tenantId) {
        try {
          const filter: any = {}
          if (activeTab === "system") {
            filter.is_system_role = true
          } else if (activeTab === "custom") {
            filter.is_system_role = false
          }
          await fetchRoles(filter, tenantHeaders)
        } catch (error) {
          console.error("Failed to load roles:", error)
        }
      }
    }

    loadRoles()
  }, [fetchRoles, tenantId, activeTab])

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Handle role selection for navigation
  const handleRoleClick = (role: Role) => {
    const roleId = role.id || role.role_id
    if (roleId) {
      router.push(\`/dashboard/auth/roles/\${roleId}\`)
    } else {
      toast.error("Cannot view details for a role without an ID.")
    }
  }

  // Handle role deletion
  const handleDeleteRole = async (id: string) => {
    // Don't allow deletion of the Super Owner role
    if (id === "1" || id === "super") {
      toast.error("Cannot delete the Super Owner role")
      return
    }

    try {
      await deleteRole(id, tenantHeaders)
      toast.success("Role deleted successfully")
    } catch (error) {
      console.error("Failed to delete role:", error)
      toast.error("Failed to delete role")
    }
  }

  // Navigate to edit role page
  const handleEditRole = (id: string) => {
    router.push(\`/dashboard/auth/roles/\${id}/edit\`)
  }

  // Navigate to add role page
  const handleAddRole = () => {
    router.push("/dashboard/auth/roles/add")
  }

  // Get filtered roles
  const filteredRoles = getFilteredRoles()

  const handleRetry = () => {
    const filter: any = {}
    if (activeTab === "system") {
      filter.is_system_role = true
    } else if (activeTab === "custom") {
      filter.is_system_role = false
    }
    fetchRoles(filter, tenantHeaders)
  }

  if (loading && roles.length === 0) {
    return <Spinner />;
  }

  if (storeError && roles.length === 0) {
    return (
      <ErrorCard
        title="Failed to load roles"
        error={storeError ? { message: storeError.message, status: String(storeError.status) } : undefined}
        buttonText="Retry"
        buttonAction={handleRetry}
        buttonIcon={RotateCcw}
      />
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mx-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">Manage user roles</p>
        </div>

        <Can permission="roles:create">
          <Button onClick={handleAddRole}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </Can>
      </div>
      <Separator />
      <div className="px-4">
        <div className="relative w-full md:w-auto mb-6">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              className="pl-8 w-full md:w-[300px]"
              onChange={handleSearch}
            />
          </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="system">System Roles</TabsTrigger>
            <TabsTrigger value="custom">Custom Roles</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <RoleTable
              roles={filteredRoles}
              onRoleClick={handleRoleClick}
              onEditRole={handleEditRole}
              onDeleteRole={handleDeleteRole}
            />
          </div>
        </Tabs>
      </div>
    </div>  
  )
}

export default withAuthorization(RolesPage, { permission: "roles:read" });
