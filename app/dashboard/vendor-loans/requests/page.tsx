"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useLoanRequestStore } from "@/features/loans/requests/store";
import { LoanRequestFilter } from "@/features/loans/requests/types";
import { RequestTable } from "@/features/loans/requests/components/request-table";

export default function LoanRequestsPage() {
  const router = useRouter();
  const session = useSession();
  const tenantId = session?.data?.user?.tenant_id || '';

  const { requests, loading, storeError, fetchRequests, updateRequestStatus } = useLoanRequestStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const pageSize = 10;

  // Define tenant headers
  const tenantHeaders = {
    'X-Tenant-ID': tenantId
  };

  // Define filter based on active tab
  const getFilters = (): LoanRequestFilter => {
    const baseFilter: LoanRequestFilter = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize
    };

    // Add search filter if available
    if (searchQuery) {
      baseFilter.search = searchQuery;
    }

    // Add filter based on the active tab
    switch (activeTab) {
      case "pending":
        return {
          ...baseFilter,
          status: "pending"
        };
      case "approved":
        return {
          ...baseFilter,
          status: "approved"
        };
      case "rejected":
        return {
          ...baseFilter,
          status: "rejected"
        };
      case "disbursed":
        return {
          ...baseFilter,
          status: "disbursed"
        };
      case "paid":
        return {
          ...baseFilter,
          status: "paid"
        };
      default:
        return baseFilter;
    }
  };

  // Fetch requests when tab changes or page changes
  useEffect(() => {
    const fetchRequestData = async () => {
      try {
        setIsTabLoading(true);
        const filters = getFilters();
        await fetchRequests(filters, tenantHeaders);
      } catch (error) {
        console.error("Error fetching loan requests:", error);
      } finally {
        setIsTabLoading(false);
      }
    };

    fetchRequestData();
  }, [fetchRequests, activeTab, currentPage, searchQuery]);

  const handleRequestClick = (request: any) => {
    router.push(`/dashboard/vendor-loans/requests/${request.request_id}`);
  };

  const handleStatusChange = async (requestId: string, status: string) => {
    try {
      await updateRequestStatus(requestId, status, tenantHeaders);

      // Refresh the request list after status change
      const filters = getFilters();
      fetchRequests(filters, tenantHeaders);
    } catch (error) {
      console.error("Failed to update request status:", error);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Requests</h1>
            <p className="text-muted-foreground">
              View and manage loan requests from vendors
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!requests && !loading && storeError) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Requests</h1>
            <p className="text-muted-foreground">
              View and manage loan requests from vendors
            </p>
          </div>
        </div>

        <div>
          <ErrorCard
            title="Failed to load loan requests"
            error={{
              status: storeError.status?.toString() || "Error",
              message: storeError.message || "An error occurred"
            }}
            buttonText="Retry"
            buttonAction={() => fetchRequests(getFilters(), tenantHeaders)}
            buttonIcon={RefreshCw}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Requests</h1>
          <p className="text-muted-foreground">
            View and manage loan requests from vendors
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between mb-4">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8"
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="disbursed">Disbursed</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <RequestTable
                requests={requests}
                onView={handleRequestClick}
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <RequestTable
                requests={requests}
                onView={handleRequestClick}
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <RequestTable
                requests={requests}
                onView={handleRequestClick}
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <RequestTable
                requests={requests}
                onView={handleRequestClick}
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
          <TabsContent value="disbursed" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <RequestTable
                requests={requests}
                onView={handleRequestClick}
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
          <TabsContent value="paid" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <RequestTable
                requests={requests}
                onView={handleRequestClick}
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* TODO: Add pagination component here if needed */}
      </div>
    </div>
  );
}
