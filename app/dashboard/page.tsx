"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { SuperAdminDashboard } from "@/features/dashboard/components/super-admin/super-admin-dashboard";
import { AdminDashboard } from "@/features/dashboard/components/admin/admin-dashboard";
import { SubAdminDashboard } from "@/features/dashboard/components/sub-admin/sub-admin-dashboard";
import { SupportDashboard } from "@/features/dashboard/components/support/support-dashboard";
import { useSelectedTenantStore } from "@/features/tenants/store";
import { usePermissions } from "@/features/auth/hooks/use-permissions";

const DashboardComponents = {
  super: SuperAdminDashboard,
  admin: AdminDashboard,
  sub_admin: SubAdminDashboard,
  support: SupportDashboard,
} as const;

// Role priority order (highest to lowest)
const rolePriority = ['super', 'admin', 'sub_admin', 'support'];

function getUserPrimaryRole(user: any): string | null {
  if (!user?.roles) {
    return user?.role || null; // Fallback to single role if roles array doesn't exist
  }

  // Extract role names from roles array (handle both string and object formats)
  const userRoles = user.roles.map((role: any) =>
    typeof role === 'string' ? role : role.role
  );

  // Find the highest priority role the user has
  for (const role of rolePriority) {
    if (userRoles.includes(role)) {
      return role;
    }
  }

  // If no recognized role found, return the first role or fallback
  return userRoles[0] || user?.role || null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { selectedTenantId } = useSelectedTenantStore();
  const { hasRole, isLoading: permissionsLoading } = usePermissions();

  if (status === "loading" || permissionsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/");
  }

  const primaryRole = getUserPrimaryRole(session.user);
  
  // Logic for super user: if tenant is selected, show AdminDashboard
  // Only super users should check for selectedTenantId
  if (hasRole("super") && selectedTenantId) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col">
          <AdminDashboard />
        </div>
      </div>
    );
  }

  // For non-super users, always use their role-based dashboard
  const DashboardComponent = primaryRole
    ? DashboardComponents[primaryRole as keyof typeof DashboardComponents]
    : null;

  if (!DashboardComponent) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">
          Dashboard not available for your role.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col">
        <DashboardComponent />
      </div>
    </div>
  );
}
