"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, Search, RotateCcw } from "lucide-react"
import { useUserStore } from "@/features/auth/stores/user-store"
import { User } from "@/features/auth/types/user"
import { UserTable } from "@/features/auth/components/user-table"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { toast } from "sonner";

import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

function UsersPage() {
  const router = useRouter()
  const { data:session } = useSession()
  const {
    users,
    loading,
    storeError,
    selectedUser,
    selectUser,
    setSearchQuery,
    getFilteredUsers,
    fetchUsers,
    changeUserStatus
  } = useUserStore()

  const [activeTab, setActiveTab] = useState<string>("all");
  const tenantId = session?.user?.tenant_id;
  
  // Define tenant headers
  const tenantHeaders = {
    "X-Tenant-ID": tenantId,
  };
  
  // Fetch users when activeTab changes
  useEffect(() => {
    const loadUsers = async () => {
      try {
        let statusFilter;
        switch (activeTab) {
          case "active":
            statusFilter = { is_active: true };
            break;
          case "inactive":
            statusFilter = { is_active: false };
            break;
          default:
            statusFilter = undefined;
        }
        await fetchUsers(statusFilter, tenantHeaders);
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers();
  }, [fetchUsers, activeTab])
  
  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }
  
  // Handle tab filter
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  }
  
  // Handle user selection
  const handleUserClick = (user: User) => {
    const userId = user.id || user.user_id
    if (userId) {
      router.push(\`/dashboard/auth/users/\${userId}\`)
    } else {
      toast.error("Cannot view details for a user without an ID.")
    }
  }
  
  // Handle user activation/deactivation
  const handleActivateUser = async (id: string) => {
    try {
      await changeUserStatus(id, 'active')
    } catch (error) {
      console.error('Failed to activate user:', error)
    }
  }
  
  const handleDeactivateUser = async (id: string) => {
    try {
      await changeUserStatus(id, 'inactive')
    } catch (error) {
      console.error('Failed to deactivate user:', error)
    }
  }
  
  // Navigate to edit user page
  const handleEditUser = (id: string) => {
    router.push(\`/dashboard/auth/users/\${id}/edit\`)
  }
  
  // Navigate to add user page
  const handleAddUser = () => {
    router.push('/dashboard/auth/users/add')
  }
  
  // Get filtered users
  const filteredUsers = getFilteredUsers()

  const handleRetry = () => {
    const filter: any = {}
    if (activeTab === "active") {
      filter.is_active = true
    } else if (activeTab === "inactive") {
      filter.is_active = false
    }
    fetchUsers(filter, tenantHeaders)
  }

  if (loading && users.length === 0) {
    return <Spinner className="absolute top-1/2 left-1/2" />
  }

  if (storeError && users.length === 0) {
    return (
      <ErrorCard
        title="Failed to load users"
        error={storeError ? { message: storeError.message, status: String(storeError.status) } : undefined}
        buttonText="Retry"
        buttonAction={handleRetry}
        buttonIcon={RotateCcw}
      />
    )
  }
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mx-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts
          </p>
        </div>
        
        <Can permission="users:create">
          <Button onClick={handleAddUser}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </Can>
      </div>
      <Separator />

      <div className="relative w-full md:w-auto mx-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-8 w-full md:w-[300px]"
          onChange={handleSearch}
        />
      </div>
      
      <div className="flex flex-col gap-4 mx-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="all">
              All Users
            </TabsTrigger>
            <TabsTrigger value="active">
              Active
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <UserTable
          users={filteredUsers}
          onUserClick={handleUserClick}
          onActivateUser={handleActivateUser}
          onDeactivateUser={handleDeactivateUser}
          onEditUser={handleEditUser}
        />
      </div>
    </div>
  )
}

export default withAuthorization(UsersPage, { permission: "users:read" });
