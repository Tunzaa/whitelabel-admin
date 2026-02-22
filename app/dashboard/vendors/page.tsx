"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import Pagination from "@/components/ui/pagination";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useVendorStore } from "@/features/vendors/store";
import { VendorFilter, VendorListResponse } from "@/features/vendors/types";
import { VendorTable } from "@/features/vendors/components/vendor-table";
import { useSession } from "next-auth/react";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

function VendorsPage() {
  const router = useRouter();
  const session = useSession();
  const tenantId = session?.data?.user?.tenant_id;
  const { vendors, loading, storeError, fetchVendors, updateVendorStatus } =
    useVendorStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const pageSize = 10;

  // Define tenant headers
  const tenantHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }
    return headers;
  }, [tenantId]);

  // Define filter based on active tab
  const getFilters = (): VendorFilter => {
    const baseFilter: VendorFilter = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };

    // Add search filter if available
    if (searchQuery) {
      baseFilter.search = searchQuery;
    }

    // Add filter based on the active tab
    switch (activeTab) {
      case "active":
        return {
          ...baseFilter,
          verification_status: "approved",
          is_active: true,
        };
      case "inactive":
        return {
          ...baseFilter,
          verification_status: "approved",
          is_active: false,
        };
      case "pending":
        return {
          ...baseFilter,
          verification_status: "pending",
        };
      case "rejected":
        return {
          ...baseFilter,
          verification_status: "rejected",
        };
      default:
        return baseFilter;
    }
  };

  // Fetch vendors when tab changes or page changes
  useEffect(() => {
    const fetchVendorsData = async () => {
      try {
        setIsTabLoading(true);
        const filters = getFilters();
        await fetchVendors(filters, tenantHeaders);
      } catch (error) {
      } finally {
        setIsTabLoading(false);
      }
    };

    fetchVendorsData();
  }, [fetchVendors, activeTab, currentPage, searchQuery]);

  const handleVendorClick = (vendor: VendorListResponse["items"][0]) => {
    router.push(`/dashboard/vendors/${vendor.vendor_id}`);
  };

  const handleStatusChange = async (
    vendorId: string,
    status: string,
    rejectionReason?: string,
  ) => {
    try {
      // Pass tenant headers and rejection reason to the updateVendorStatus function
      await updateVendorStatus(
        vendorId,
        status,
        tenantHeaders,
        rejectionReason,
      );

      // Refresh the vendor list after status change
      const filters = getFilters();
      fetchVendors(filters, tenantHeaders);
    } catch (error) {
    }
  };

  // Filter vendors based on search query
  const filteredVendors =
    vendors?.items?.filter((vendor) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();

      return (
        vendor.business_name?.toLowerCase().includes(query) ||
        vendor.display_name?.toLowerCase().includes(query) ||
        vendor.contact_email?.toLowerCase().includes(query) ||
        vendor.contact_phone?.toLowerCase().includes(query)
      );
    }) || [];

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  if (loading && vendors.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
            <p className="text-muted-foreground">
              Manage vendor applications and accounts
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/vendors/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>

        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!vendors && !loading && storeError) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
            <p className="text-muted-foreground">
              Manage vendor applications and accounts
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/vendors/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>

        <div>
          <ErrorCard
            title="Failed to load vendors"
            error={{
              status: storeError.status?.toString() || "Error",
              message: storeError.message || "An error occurred",
            }}
            buttonText="Retry"
            buttonAction={() => fetchVendors(getFilters(), tenantHeaders)}
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
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage vendor applications and accounts
          </p>
        </div>
        <Can permission="vendors:create">
          <Button onClick={() => router.push("/dashboard/vendors/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </Can>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between mb-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search vendors..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all">All Vendors</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          {isTabLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner />
            </div>
          ) : (
            <div>
              <VendorTable
                vendors={filteredVendors}
                onVendorClick={handleVendorClick}
                onStatusChange={handleStatusChange}
                activeTab={activeTab}
              />
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={vendors.total}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default withAuthorization(VendorsPage, { permission: "vendors:read" });
