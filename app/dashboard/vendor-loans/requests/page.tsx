"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/ui/pagination";
import { useLoanRequestStore } from "@/features/loans/requests/store";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";
import { RequestTable } from "@/features/loans/requests/components/request-table";

function LoanRequestsPage() {
  console.log('[Loan Requests] Component rendering');
  const router = useRouter();
  const session = useSession();
  const tenantId = (session?.data?.user as { tenant_id?: string })?.tenant_id;
  const isFetchingRef = useRef(false);

  const {
    requests,
    loading,
    storeError,
    fetchRequests,
    updateRequestStatus,
    setStoreError,
    setRequests,
  } = useLoanRequestStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 10;

  // Define tenant headers
  const tenantHeaders = {
    "X-Tenant-ID": tenantId,
  };

  // Define filter based on active tab
  const getFilter = () => {
    const filter: any = {};
    if (activeTab !== "all") filter.status = activeTab;
    filter.skip = (currentPage - 1) * pageSize;
    filter.limit = pageSize;
    console.log('[Loan Requests] getFilter returning:', filter, 'for tab:', activeTab);
    return filter;
  };

  // Function to load requests
  const loadRequests = async (showLoadingState = true) => {
    if (isFetchingRef.current) {
      console.log('[Loan Requests] Already fetching, skipping duplicate call');
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoadingState) {
        setIsTabLoading(true);
      }
      setStoreError(null);
      const filter = getFilter();
      console.log('[Loan Requests] Fetching with filter:', filter);
      const result = await fetchRequests(
        {
          ...filter,
          search: searchTerm,
        },
        tenantHeaders,
      );
      console.log('[Loan Requests] Fetch result:', result);
    } catch (error) {
      console.error('[Loan Requests] Fetch error:', error);
      // Always set empty requests array for 404 errors (no requests found)
      if (
        error instanceof Error &&
        ((error.message.includes("404") &&
          error.message.includes("No requests found")) ||
          error.message.includes("not found") ||
          error.message.includes("404"))
      ) {
        setStoreError(null);
      } else {
        // For other errors, set the error
        setStoreError(
          error instanceof Error ? error : new Error("Failed to load loan requests"),
        );
      }
    } finally {
      isFetchingRef.current = false;
      if (showLoadingState) {
        setIsTabLoading(false);
      }
    }
  };

  // Handle request click
  const handleRequestClick = (request: LoanRequest) => {
    const requestId = request.request_id || request.id || request._id;
    if (requestId) {
      router.push(`/dashboard/vendor-loans/requests/${requestId}`);
    }
  };

  // Handle status change
  const handleRequestStatusChange = async (
    requestId: string,
    status: string,
  ) => {
    try {
      setStoreError(null);
      await updateRequestStatus(requestId, status, tenantHeaders);
      toast.success(`Request ${status.replace(/_/g, " ")}`);
      await loadRequests();
    } catch (error) {
      if ((error as any)?.response?.status === 200) {
        toast.success(`Request ${status.replace(/_/g, " ")}`);
        await loadRequests();
      } else {
        toast.error("Failed to update request status");
      }
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    console.log('[Loan Requests] Tab changing to:', value);
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  // Effect for loading requests on initial page load
  useEffect(() => {
    if (tenantId) {
      loadRequests();

      const checkForRefreshFlag = () => {
        const needsRefresh = localStorage.getItem("requestsNeedRefresh");
        if (needsRefresh === "true") {
          // Clear the flag
          localStorage.removeItem("requestsNeedRefresh");
          // Refresh requests without showing loading state
          loadRequests(false);
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
      loadRequests();
    }
  }, [tenantId, activeTab, currentPage, searchTerm]);

  // Log when requests state changes to debug re-rendering
  useEffect(() => {
    console.log('[Loan Requests] requests state changed:', requests);
  }, [requests]);

  // Determine which requests to show
  const displayRequests = requests?.items || [];

  console.log('[Loan Requests] Current state:', {
    requests,
    displayRequests,
    loading,
    isTabLoading,
    storeError,
    activeTab,
  });

  if (loading && !requests?.items?.length && !isTabLoading) {
    console.log('[Loan Requests] Early return - loading with no data');
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Requests</h1>
            <p className="text-muted-foreground">
              Manage vendor loan requests and approvals
            </p>
          </div>
        </div>
        <Spinner />
      </div>
    );
  }

  if (storeError && !requests?.items?.length && !isTabLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Requests</h1>
            <p className="text-muted-foreground">
              Manage vendor loan requests and approvals
            </p>
          </div>
        </div>
        <div className="p-4">
          <ErrorCard
            title="Error Loading Loan Requests"
            error={{
              message: storeError?.message || "Failed to load loan requests",
              status: storeError?.status ? String(storeError.status) : "error",
            }}
            buttonText="Try Again"
            buttonAction={() => loadRequests()}
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
          <h1 className="text-2xl font-bold tracking-tight">Loan Requests</h1>
          <p className="text-muted-foreground">
            Manage vendor loan requests and approvals
          </p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex justify-between mb-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadRequests(false)}
                title="Refresh requests"
                className="relative"
              >
                <RefreshCw />
              </Button>
              <Input
                type="search"
                placeholder="Search requests..."
                className="w-[250px] pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="p-0">
              {isTabLoading ? (
                <Spinner />
              ) : (
                (() => {
                  console.log('[Loan Requests] Rendering RequestTable with displayRequests:', displayRequests);
                  return (
                    <RequestTable
                      requests={displayRequests}
                      onView={(request) => handleRequestClick(request)}
                      onStatusChange={handleRequestStatusChange}
                    />
                  );
                })()
              )}
            </CardContent>
          </Card>
        </Tabs>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={requests?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
}

const ExportedLoanRequestsPage = withAuthorization(LoanRequestsPage, "vendor-loans:read");
export default ExportedLoanRequestsPage;
