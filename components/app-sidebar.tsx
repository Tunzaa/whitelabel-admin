"use client";

import * as React from "react";
import {
  IconDashboard,
  IconInnerShadowTop,
  IconBell,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { NotificationTrigger } from "@/components/notification-trigger";
import { navigationData, NavItem } from "./sidebar-data";
import { usePermissions } from "@/features/auth/hooks/use-permissions";
import { useModules } from "@/features/auth/hooks/use-modules";
import useAuthStore from "@/features/auth/store";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { useSelectedTenantStore } from "@/features/tenants/store";

// Use the imported navigation data instead of redefining it inline
const data = {
  navMain: navigationData.navMain,
  navSecondary: navigationData.navSecondary,
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onNotificationClick?: () => void;
}

export function AppSidebar({ onNotificationClick, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { can, hasRole, isLoading, permissionsLoaded, permissions } =
    usePermissions();
  const { isModuleEnabled, isLoading: modulesLoading } = useModules();
  const userFromStore = useAuthStore((state) => state.user);
  const { selectedTenantId } = useSelectedTenantStore();

  // Determine super user status at component level
  const isSuperUser = hasRole("super");

  const user = userFromStore
    ? {
        name: userFromStore.name,
        email: userFromStore.email,
        avatar: session?.user?.image || "/avatars/default.jpg", // Still get avatar from session for now
      }
    : {
        name: "Guest",
        email: "",
        avatar: "/avatars/default.jpg",
      };

  const filterByPermissionAndRole = (item: NavItem) => {
    try {
      // If user is super and no tenant is selected, hide tenant-specific items
      const tenantSpecificUrls = [
        "/dashboard/categories",
        "/dashboard/vendors",
        "/dashboard/products",
        "/dashboard/affiliates",
        "/dashboard/delivery-partners",
        "/dashboard/orders",
        "/dashboard/rewards",
        "/dashboard/vendor-loans",
        "/dashboard/tenants/marketplace",
      ];

      // Check if item URL or any sub-item URL matches tenant-specific paths
      const isTenantSpecific = (url: string) =>
        tenantSpecificUrls.some((tsUrl) => url.startsWith(tsUrl));

      const hasTenantSpecificUrl =
        isTenantSpecific(item.url) ||
        (item.items && item.items.some(subItem => isTenantSpecific(subItem.url)));

      if (isSuperUser && !selectedTenantId && hasTenantSpecificUrl) {
        return false;
      }

      // Check permission requirement
      const hasRequiredPermission =
        !item.requiredPermission || can(item.requiredPermission);

      // Check role requirement
      const hasRequiredRole = !item.requiredRole || hasRole(item.requiredRole);

      // Check module requirement (skip for super users to keep sidebar stable)
      const hasRequiredModule =
        isSuperUser || !item.requiredModule || isModuleEnabled(item.requiredModule);

      // All conditions must be met
      return hasRequiredPermission && hasRequiredRole && hasRequiredModule;
    } catch (error) {
      // If filtering fails, default to showing the item
      return true;
    }
  };

  const filteredNavMain = React.useMemo(() => {
    // Don't show any navigation items until permissions are loaded
    // For super users, skip modules loading check to keep sidebar stable
    if (!permissionsLoaded || (!isSuperUser && modulesLoading)) return [];

    return data.navMain
      .filter(filterByPermissionAndRole)
      .map(item => {
        // If item has sub-items, filter them as well
        if (item.items && Array.isArray(item.items)) {
          const filteredSubItems = item.items.filter(subItem => {
            try {
              // Check permission requirement for sub-item
              const hasRequiredPermission =
                !subItem.requiredPermission || can(subItem.requiredPermission);

              // Check role requirement for sub-item
              const hasRequiredRole = !subItem.requiredRole || hasRole(subItem.requiredRole);

              // Check module requirement for sub-item (skip for super users)
              const hasRequiredModule =
                isSuperUser || !subItem.requiredModule || isModuleEnabled(subItem.requiredModule);

              // All conditions must be met
              return hasRequiredPermission && hasRequiredRole && hasRequiredModule;
            } catch (error) {
              // If filtering fails, default to showing the sub-item
              return true;
            }
          });

          // Only include the item if it has sub-items after filtering, or if it has no sub-items originally
          return filteredSubItems.length > 0 ? { ...item, items: filteredSubItems } : null;
        }

        // For items without sub-items, keep as-is
        return item;
      })
      .filter(Boolean); // Remove null items
  }, [filterByPermissionAndRole, permissionsLoaded, modulesLoading, isSuperUser]);

  const filteredNavSecondary = React.useMemo(() => {
    // Don't show any navigation items until permissions are loaded
    // For super users, skip modules loading check to keep sidebar stable
    if (!permissionsLoaded || (!isSuperUser && modulesLoading)) return [];
    return data.navSecondary.filter(filterByPermissionAndRole);
  }, [filterByPermissionAndRole, permissionsLoaded, modulesLoading, isSuperUser]);

  // Skeleton component for loading navigation items
  const NavigationSkeleton = () => (
    <>
      {[...Array(4)].map((_, index) => (
        <SidebarMenuItem key={`skeleton-${index}`}>
          <SidebarMenuButton className="data-[slot=sidebar-menu-button]:!p-1.5">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-42" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );

  // Skeleton component for secondary navigation
  const SecondaryNavigationSkeleton = () => (
    <>
      {[...Array(2)].map((_, index) => (
        <SidebarMenuItem key={`secondary-skeleton-${index}`}>
          <SidebarMenuButton className="data-[slot=sidebar-menu-button]:!p-1.5">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-36" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              asChild
              tooltip="Dashboard"
              isActive={pathname === "/dashboard"}
              className={cn(
                "min-w-8 duration-200 ease-linear",
                pathname === "/dashboard" &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground",
              )}
            >
              <a href="/dashboard">
                <IconDashboard />
                <span>Dashboard</span>
              </a>
            </SidebarMenuButton>
            <NotificationTrigger>
              <Button
                variant="outline"
                size="icon"
                className="size-8 group-data-[collapsible=icon]:opacity-0"
                onClick={onNotificationClick}
              >
                <IconBell className="h-5 w-5" />
              </Button>
            </NotificationTrigger>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {!permissionsLoaded ? (
            <NavigationSkeleton />
          ) : (
            Array.isArray(filteredNavMain) && filteredNavMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      className={cn(
                        "data-[slot=sidebar-menu-button]:!p-1.5",
                        pathname === item.url &&
                          "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear",
                      )}
                    >
                      <a
                        href={item.url}
                        target={item.target}
                        rel={
                          item.target === "_blank"
                            ? "noopener noreferrer"
                            : undefined
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {Array.isArray(item.items) && item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url}
                          >
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className={cn(
                      "data-[slot=sidebar-menu-button]:!p-1.5",
                      pathname === item.url &&
                        "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear",
                    )}
                  >
                    <a
                      href={item.url}
                      target={item.target}
                      rel={
                        item.target === "_blank"
                          ? "noopener noreferrer"
                          : undefined
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
        {/* <NavDocuments items={data.documents} /> */}
        {!permissionsLoaded ? (
          <div className="mt-auto">
            <div className="px-3 py-2">
              <SecondaryNavigationSkeleton />
            </div>
          </div>
        ) : (
          <NavSecondary items={filteredNavSecondary} className="mt-auto" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
