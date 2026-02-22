"use client";

import { AppSidebar } from "@/components/app-sidebar";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NotificationSheet } from "@/components/notification-sheet";
import { useState, useEffect, useRef } from "react";
import React from "react";
import { useSession } from "next-auth/react";
import useAuthStore from "@/features/auth/store";
import { Role } from "@/features/auth/types";
import { useSelectedTenantStore, useTenantStore } from "@/features/tenants/store";
import { Spinner } from "@/components/ui/spinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { data: session } = useSession();
  const { setUser, fetchPermissions, clearPermissions } = useAuthStore();
  const { selectedTenantId } = useSelectedTenantStore();
  const { loading: tenantLoading } = useTenantStore();
  
  // Track last fetched user ID to prevent duplicate fetches
  const lastFetchedUserIdRef = useRef<string | null>(null);
  
  // Track tenant switching for loading state
  const [isTenantSwitching, setIsTenantSwitching] = useState(false);
  const prevTenantRef = useRef<string | null>(null);
  
  // Detect tenant switch and show loading
  useEffect(() => {
    if (prevTenantRef.current !== selectedTenantId && prevTenantRef.current !== null) {
      // Tenant changed, show spinner
      setIsTenantSwitching(true);
    }
    prevTenantRef.current = selectedTenantId;
  }, [selectedTenantId]);
  
  // Clear loading when tenant data is loaded
  useEffect(() => {
    if (!tenantLoading && isTenantSwitching) {
      setIsTenantSwitching(false);
    }
  }, [tenantLoading, isTenantSwitching]);

  useEffect(() => {
    const userId = session?.user?.id;
    
    // Skip if no user or already fetched for this user
    if (!userId || lastFetchedUserIdRef.current === userId) {
      if (!userId) {
        // Clear permissions when session is lost
        clearPermissions();
        lastFetchedUserIdRef.current = null;
      }
      return;
    }
    
    // Mark as fetched for this user
    lastFetchedUserIdRef.current = userId;
    
    const sessionUser = session!.user as any;
    const userWithRoles = {
      id: userId,
      name: session!.user.name ?? "Guest",
      email: session!.user.email ?? "",
      // Set roles correctly - extractUserRoles expects the roles property to contain the role data
      roles: sessionUser.roles || (sessionUser.role ? [sessionUser.role] : []),
      // Include tenant_id for non-super users
      tenant_id: sessionUser.tenant_id,
    };
    setUser(userWithRoles);

    const tenantId = sessionUser.tenant_id;
    if (tenantId) {
      const headers = { 'X-Tenant-ID': tenantId };
      fetchPermissions(userId, headers);
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
        {isTenantSwitching ? (
          <Spinner />
        ) : (
          <React.Fragment key={selectedTenantId || 'no-tenant'}>
            {children}
          </React.Fragment>
        )}
      </SidebarInset>
      <NotificationSheet 
        open={isNotificationOpen} 
        onOpenChange={setIsNotificationOpen} 
      />
    </SidebarProvider>
  );
}
