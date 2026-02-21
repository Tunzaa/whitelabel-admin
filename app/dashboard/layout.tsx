"use client";

import { AppSidebar } from "@/components/app-sidebar";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NotificationSheet } from "@/components/notification-sheet";
import { useState, useEffect } from "react";
import React from "react";
import { useSession } from "next-auth/react";
import useAuthStore from "@/features/auth/store";
import { Role } from "@/features/auth/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { data: session } = useSession();
  const { setUser, fetchPermissions, clearPermissions } = useAuthStore();

  useEffect(() => {
    if (session?.user?.id) {
      const sessionUser = session.user as any;
      const userWithRoles = {
        id: session.user.id,
        name: session.user.name ?? "Guest",
        email: session.user.email ?? "",
        // Set roles correctly - extractUserRoles expects the roles property to contain the role data
        roles: sessionUser.roles || (sessionUser.role ? [sessionUser.role] : []),
        // Include tenant_id for non-super users
        tenant_id: sessionUser.tenant_id,
      };
      setUser(userWithRoles);

      const tenantId = (session.user as any)?.tenant_id;
      if (tenantId) {
        const headers = { 'X-Tenant-ID': tenantId };
        fetchPermissions(session.user.id, headers);
      }
    } else {
      // Clear permissions when session is lost
      clearPermissions();
    }
  }, [session?.user?.id, setUser, fetchPermissions, clearPermissions]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar 
        variant="inset" 
        onNotificationClick={() => setIsNotificationOpen(true)} 
      />
      <SidebarInset>
        <React.Fragment key="header">
          <SiteHeader />
        </React.Fragment>
        <React.Fragment key="content">
          {children}
        </React.Fragment>
      </SidebarInset>
      <NotificationSheet 
        open={isNotificationOpen} 
        onOpenChange={setIsNotificationOpen} 
      />
    </SidebarProvider>
  );
}
