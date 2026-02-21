"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useDashboardStore } from "@/features/dashboard/store";
import { useSelectedTenantStore } from "@/features/tenants/store";
import { usePermissions } from "@/features/auth/hooks/use-permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardStatCards } from "./dashboard-stat-cards";
import { TopPerformingProductsTable } from "./top-performing-products-table";
import { OrderStatusPieChart } from "./order-status-pie-chart";
import { PaymentSuccessRatePieChart } from "./payment-success-rate-pie-chart";
import { GmvPerformanceChart } from "./gmv-performance-chart";
import { NewVsReturningBuyersChart } from "./new-vs-returning-buyers-chart";
import { CartAbandonmentRateChart } from "./cart-abandonment-rate-chart";

export function AdminDashboard() {
  const { data: session } = useSession();
  const { hasRole } = usePermissions();
  const { selectedTenantId } = useSelectedTenantStore();

  // For regular admin, use their own tenant_id from session
  // For super user, use the selected tenant_id from store
  // Non-super users should never use selectedTenantId even if it exists
  const tenantId = hasRole("super") ? selectedTenantId : (session?.user as any)?.tenant_id;

  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchAllReports = useDashboardStore((state) => state.fetchAllReports);
  const error = useDashboardStore((state) => state.error);
  const isLoading = useDashboardStore(
    (state) =>
      state.loadingGmvData ||
      state.loadingActiveUsersData ||
      state.loadingOrderStatusDistributionData ||
      state.loadingPaymentSuccessRate ||
      state.loadingTopPerformingProducts ||
      state.loadingDailyGmvPerformance ||
      state.loadingWeeklyGmvPerformance ||
      state.loadingMonthlyGmvPerformance ||
      state.loadingAverageOrderValue ||
      state.loadingNewVsReturningBuyers ||
      state.loadingCartAbandonmentRate
  );
  const hasData = useDashboardStore((state) => !!state.gmvData);

  const handleRefresh = () => {
    if (!tenantId || isRefreshing) return;
    
    setIsRefreshing(true);
    fetchAllReports(tenantId);
    // Reset refreshing state after a short delay
    const timer = setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  };

  useEffect(() => {
    if (tenantId) {
      fetchAllReports(tenantId);
    }
  }, [tenantId, fetchAllReports]);

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
            <h1 className="text-2xl font-bold tracking-tight">MarketPlace Dashboard</h1>
            <p className="text-muted-foreground">
              An overview of your marketplace performance.
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
        <DashboardStatCards />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-5">
            <GmvPerformanceChart />
          </div>
          <div className="lg:col-span-2 flex flex-col">
            <OrderStatusPieChart />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <TopPerformingProductsTable />
          </div>
          <div className="lg:col-span-3">
            <NewVsReturningBuyersChart />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-5">
            <CartAbandonmentRateChart />
          </div>
          <div className="lg:col-span-2">
            <PaymentSuccessRatePieChart />
          </div>
        </div>
      </div>
    </div>
  );
}
