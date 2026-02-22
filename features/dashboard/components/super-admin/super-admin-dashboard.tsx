"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useDashboardStore } from "@/features/dashboard/store";
import { useTenantStore } from "@/features/tenants/store";
import { useSelectedTenantStore } from "@/features/tenants/store";
import { usePermissions } from "@/features/auth/hooks/use-permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SuperAdminStatCards } from "./super-admin-stat-cards";
import { TenantPerformanceTable } from "./tenant-performance-table";
import { PlatformGmvChart } from "./platform-gmv-chart";
import { BillingMetricsCard } from "./billing-metrics-card";
import { PlatformOrderStatusChart } from "./platform-order-status-chart";

export function SuperAdminDashboard() {
  const { data: session } = useSession();
  const { hasRole } = usePermissions();
  const { selectedTenantId } = useSelectedTenantStore();
  const hasFetched = useRef(false);

  // Super admin doesn't use tenant context for platform-wide reports
  const tenantId = null;

  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dashboard store for report APIs - only fetch what super admin needs
  const fetchDailyGmvPerformance = useDashboardStore((state) => state.fetchDailyGmvPerformance);
  const fetchWeeklyGmvPerformance = useDashboardStore((state) => state.fetchWeeklyGmvPerformance);
  const fetchMonthlyGmvPerformance = useDashboardStore((state) => state.fetchMonthlyGmvPerformance);
  const fetchOrderStatusDistributionReport = useDashboardStore((state) => state.fetchOrderStatusDistributionReport);
  const error = useDashboardStore((state) => state.error);
  const isLoading = useDashboardStore(
    (state) =>
      state.loadingDailyGmvPerformance ||
      state.loadingWeeklyGmvPerformance ||
      state.loadingMonthlyGmvPerformance ||
      state.loadingOrderStatusDistributionData
  );

  // Tenant store for tenant list and billing metrics
  const fetchTenants = useTenantStore((state) => state.fetchTenants);
  const fetchBillingDashboardMetrics = useTenantStore((state) => state.fetchBillingDashboardMetrics);
  const loadingTenants = useTenantStore((state) => state.loading);

  const handleRefresh = () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Fetch tenant and billing data
    fetchTenants();
    fetchBillingDashboardMetrics();
    
    // Fetch platform-wide reports (GMV performance and order status)
    fetchDailyGmvPerformance('null');
    fetchWeeklyGmvPerformance('null');
    fetchMonthlyGmvPerformance('null');
    fetchOrderStatusDistributionReport('null');
    
    // Reset refreshing state after a short delay
    const timer = setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  };

  useEffect(() => {
    // Prevent duplicate initial fetches
    if (hasFetched.current) {
      return;
    }
    hasFetched.current = true;
    
    // Fetch tenant list and billing metrics on mount
    fetchTenants();
    fetchBillingDashboardMetrics();
    
    // For super admin, fetch platform-wide reports without tenant context
    fetchDailyGmvPerformance('null');
    fetchWeeklyGmvPerformance('null');
    fetchMonthlyGmvPerformance('null');
    fetchOrderStatusDistributionReport('null');
  }, []);

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load dashboard data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 p-4 pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Dashboard</h1>
            <p className="text-muted-foreground">
              An overview of your platform performance across all tenants.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', { 'animate-spin': isRefreshing })} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>
      <Separator />

      <div className="p-4 pt-2 space-y-4">
        <SuperAdminStatCards />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-5">
            <PlatformGmvChart />
          </div>
          <div className="lg:col-span-2 flex flex-col">
            <PlatformOrderStatusChart />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <TenantPerformanceTable />
          </div>
          <div className="lg:col-span-3">
            <BillingMetricsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
