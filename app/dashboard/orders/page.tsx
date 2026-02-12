"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { RefreshCw, Search, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";

import { OrderTable } from "@/features/orders/components/order-table";
import { useOrderStore } from "@/features/orders/store";
import type { Order, OrderStatus, OrderFilter } from "@/features/orders/types";
import Pagination from "@/components/ui/pagination";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

function OrdersPage() {
  const router = useRouter();
  const session = useSession();
  const tenantId = session?.data?.user
    ? (session.data.user as any).tenant_id
    : undefined;

  const {
    orders,
    loading,
    storeError,
    fetchOrders,
    updateOrderStatus,
    setOrders,
    setStoreError,
  } = useOrderStore();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [isTabLoading, setIsTabLoading] = useState(false);
  // Use the DateRange type from react-day-picker that the Calendar component expects
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const pageSize = 20;

  // Define tenant headers
  const tenantHeaders = {
    "X-Tenant-ID": tenantId,
  };

  // Define filter based on active tab
  const getFilter = () => {
    const filter: any = {};
    if (activeTab !== "all" && activeTab !== "tickets")
      filter.status = activeTab as OrderStatus;
    if (activeTab === "tickets") filter.has_ticket = true;
    filter.skip = (currentPage - 1) * pageSize;
    filter.limit = pageSize;
    return filter;
  };

  // Function to load orders
  const loadOrders = async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setIsTabLoading(true);
      }
      setStoreError(null);
      const filter = getFilter();
      // Clear previous orders before making a new search
      if (searchTerm) {
        setOrders(null);
      }
      const result = await fetchOrders(
        {
          ...filter,
          search: searchTerm,
          dateFrom: dateRange?.from?.toISOString(),
          dateTo: dateRange?.to?.toISOString(),
        },
        tenantHeaders,
      );
      // If result is empty and we have a search term, ensure orders are cleared
      if (searchTerm && (!result || result.items.length === 0)) {
        setOrders({ items: [], total: 0, skip: 0, limit: pageSize });
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      // Always set empty orders array for 404 errors (no orders found)
      if (
        error instanceof Error &&
        ((error.message.includes("404") &&
          error.message.includes("No orders found")) ||
          error.message.includes("not found") ||
          error.message.includes("404"))
      ) {
        setOrders({ items: [], total: 0, skip: 0, limit: pageSize });
        setStoreError(null);
      } else {
        // For other errors, set the error
        setStoreError(
          error instanceof Error ? error : new Error("Failed to load orders"),
        );
      }
    } finally {
      if (showLoadingState) {
        setIsTabLoading(false);
      }
    }
  };

  // Handle order click
  const handleOrderClick = (order: Order) => {
    router.push(`/dashboard/orders/${order.order_id}`);
  };

  // Handle status change
  // Update order status
  const handleOrderStatusChange = async (
    orderId: string,
    status: OrderStatus,
  ) => {
    try {
      // Clear any previous error state first
      setStoreError(null);

      // Show success toast only after successful update
      const result = await updateOrderStatus(orderId, status, tenantHeaders);
      if (result) {
        toast.success(`Order status updated to ${status.replace(/_/g, " ")}`);

        // Reload orders to ensure we have the latest data
        // This will refresh the data while staying on the same tab
        await loadOrders();
      }
    } catch (error) {
      // Check if it's actually a successful response with parsing error
      if ((error as any)?.response?.status === 200) {
        toast.success(`Order status updated to ${status.replace(/_/g, " ")}`);
        // Even if there was a parsing error but API returned 200,
        // reload the orders to get the latest data
        await loadOrders();
      } else {
        toast.error("Failed to update order status");
        console.error("Failed to update order status:", error);
      }
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  // Effect for loading orders on initial page load
  useEffect(() => {
    if (tenantId) {
      loadOrders();

      // Check if we need to refresh orders after returning from order details page
      const checkForRefreshFlag = () => {
        const needsRefresh = localStorage.getItem("ordersNeedRefresh");
        if (needsRefresh === "true") {
          // Clear the flag
          localStorage.removeItem("ordersNeedRefresh");
          // Refresh orders without showing loading state
          loadOrders(false);
        }
      };

      // Check when the component mounts
      checkForRefreshFlag();

      // Also check when window gains focus (user comes back to the tab)
      window.addEventListener("focus", checkForRefreshFlag);

      return () => {
        window.removeEventListener("focus", checkForRefreshFlag);
      };
    }
  }, [tenantId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update searchTerm if searchQuery has at least 3 characters or is empty
      if (searchQuery.length >= 3 || searchQuery.length === 0) {
        setSearchTerm(searchQuery);
        setCurrentPage(1); // Reset to first page when search term changes
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Effect for filter changes
  useEffect(() => {
    if (tenantId) {
      loadOrders();
    }
  }, [activeTab, currentPage, searchTerm, dateRange]);

  // Determine which orders to show based on active tab
  const displayOrders = orders?.items || [];

  if (loading && (!orders || orders.items.length === 0) && !isTabLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">
              Manage and track customer orders
            </p>
          </div>
        </div>
        <Spinner />
      </div>
    );
  }

  if (storeError && (!orders || orders.items.length === 0) && !isTabLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">
              Manage and track customer orders
            </p>
          </div>
        </div>
        <div className="p-4">
          <ErrorCard
            title="Error Loading Orders"
            error={{
              message: storeError?.message || "Failed to load orders",
              status: storeError?.status ? String(storeError.status) : "error",
            }}
            buttonText="Try Again"
            buttonAction={() => loadOrders()}
            buttonIcon={RefreshCw}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track customer orders
          </p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Search and Date Filter */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadOrders(false)}
                title="Refresh orders"
                className="relative"
              >
                <RefreshCw />
              </Button>
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-[250px]"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
              placeholder="Filter by date"
              className="w-[250px]"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tickets">Issues</TabsTrigger>
            <TabsTrigger value="pending">Pending Payment</TabsTrigger>
            <TabsTrigger value="processing">
              Pending Vendor Acceptance
            </TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed by Vendor</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="refund_requested">Pending Refunds</TabsTrigger>
            <TabsTrigger value="partially_refunded">
              Partial Refunds
            </TabsTrigger>
            <TabsTrigger value="refunded">Refunded</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="p-0">
              {isTabLoading ? (
                <Spinner />
              ) : (
                <>
                  <OrderTable
                    orders={displayOrders}
                    onViewDetails={handleOrderClick}
                    onStatusChange={handleOrderStatusChange}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Tabs>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={orders?.total || 0}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
