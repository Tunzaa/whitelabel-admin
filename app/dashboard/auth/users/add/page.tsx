"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft } from "lucide-react"
import { useUserStore } from "@/features/auth/stores/user-store"
import { UserForm } from "@/features/auth/components/user-form"
import { NewUserCredentialsDialog } from "@/features/auth/components/new-user-credentials-dialog"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface NewUserResponse {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  reset_password?: boolean;
}

export default function AddUserPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { createUser } = useUserStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const [newUserData, setNewUserData] = useState<NewUserResponse | null>(null)

  const tenantId = session?.user?.tenant_id

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true)

    if (!tenantId) {
      toast.error("Unable to create user: Tenant information is missing.")
      setIsSubmitting(false)
      return
    }

    try {
      // Format data for API request
      const userData = {
        ...data,
        // Ensure proper format for API
        name: `${data.first_name} ${data.last_name}`, // Some APIs might need a combined name field
      }

      const response = await createUser(userData, { "X-Tenant-ID": tenantId })

      // Check if response contains password (new user credentials)
      if (response.password) {
        setNewUserData({
          first_name: response.first_name,
          last_name: response.last_name,
          email: response.email,
          password: response.password,
        })
        setShowCredentialsDialog(true)
      } else {
        toast.success("User created successfully")
        router.push("/dashboard/auth/users")
      }
    } catch (error) {
      toast.error("Failed to create user")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push("/dashboard/auth/users")
  }

  const handleCredentialsDialogClose = () => {
    setShowCredentialsDialog(false)
    setNewUserData(null)
    router.push("/dashboard/auth/users")
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-2 mx-4">
        <Button variant="outline" size="icon" onClick={(handleCancel)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Create User</h1>
          <p className="text-foreground">Create a new user</p>
        </div>
      </div>
      <Separator />

      <UserForm onSubmit={handleSubmit} onCancel={handleCancel} />

      {newUserData && (
        <NewUserCredentialsDialog
          open={showCredentialsDialog}
          onOpenChange={handleCredentialsDialogClose}
          userData={newUserData}
        />
      )}
    </div>
  )
}
