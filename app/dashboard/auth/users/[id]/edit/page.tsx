"use client"

import { useState, useEffect } from "react"
import { useSession } from 'next-auth/react';
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useUserStore } from "@/features/auth/stores/user-store"
import { UserForm } from "@/features/auth/components/user-form"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from '@/components/ui/error-card';

interface EditUserPageProps {
  params: {
    id: string
  }
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter()
  const { data: session } = useSession();
  const { fetchUser, updateUser } = useUserStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tenantId = session?.user?.tenant_id;

  useEffect(() => {
    async function loadUser() {
      setLoading(true)
      try {
        // Fetch the user data from API
        await fetchUser(params.id, { 'X-Tenant-ID': tenantId })
          .then((userData) => {
            if (userData) {
              setUser(userData)
            } else {
              setError('User not found')
              toast.error("User not found")
              router.push("/dashboard/auth/users")
            }
          })
      } catch (err) {
        setError('Failed to load user data')
        toast.error("Failed to load user data")
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [params.id, fetchUser, router])

  const handleSubmit = async (data: any) => {
    try {
      // Format data for API request
      const updatedUser = {
        ...data,
        // Create a combined name field if API requires it
        name: `${data.first_name} ${data.last_name}`,
        // Don't manipulate timestamps - API will handle this
      }

      await updateUser(params.id, updatedUser, { 'X-Tenant-ID': tenantId })
      toast.success("User updated successfully")
      router.push("/dashboard/auth/users")
    } catch (error) {
      toast.error("Failed to update user")
    }
  }

  const handleCancel = () => {
    router.push("/dashboard/auth/users")
  }

  if (loading && !user) {
    return <Spinner />;
  }

  if (error && !user) {
    return
    <ErrorCard
      title="User Not Found"
      error={{ message: error, status: '404' }}
      buttonText="Back to Users"
      buttonAction={() => router.push('/dashboard/auth/users')}
      buttonIcon={ArrowLeft}
    />
  }

  return user ? (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-2 mx-4">
        <Button variant="outline" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Edit User: {user.name}</h1>
          <p className="text-foreground">Modify user's information</p>
        </div>
      </div>
      <Separator />

      <UserForm onSubmit={handleSubmit} onCancel={handleCancel} initialData={user} />
    </div>
  ) : null;
}
