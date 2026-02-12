"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDeliveryPartnerStore } from "@/features/delivery-partners/store";
import {
  DeliveryPartner,
  DeliveryPartnerFilter,
  DeliveryPartnerListResponse,
} from "@/features/delivery-partners/types";
import { DeliveryPartnerTable } from "@/features/delivery-partners/components/delivery-partner-table";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw, Search } from "lucide-react";
import Pagination from "@/components/ui/pagination";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

const getStatusChangeMessage = (status: string) => {
  switch (status) {
    case "approved":
      return "Partner approved successfully";
    case "rejected":
      return "Partner rejected successfully";
    case "active":
      return "Partner activated successfully";
    case "suspended":
      return "Partner suspended successfully";
    default:
      return "Partner status updated successfully";
  }
};

function DeliveryPartnersPage() {
  const router = useRouter();
  const session = useSession();
  const tenantId = (session?.data?.user as any)?.tenant_id;
  
  const {
    partners: deliveryPartners,
    loading,
    error: storeError,
    fetchDeliveryPartners,
    updateDeliveryPartner,
  } = useDeliveryPartnerStore();
  
  const pageSize = 10;
  const [currentPartnersData, setCurrentPartnersData] = useState<DeliveryPartnerListResponse>({
    items: [],
    total: 0,
    skip: 0,
    limit: pageSize,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [isTabLoading, setIsTabLoading] = useState(false);

  const tenantHeaders = {
    "X-Tenant-ID": tenantId,
  };

  const getFilters = (): DeliveryPartnerFilter => {
    const baseFilter: DeliveryPartnerFilter = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };

    if (searchQuery) {
      baseFilter.search = searchQuery;
    }

    switch (activeTab) {
      case "active":
        return { ...baseFilter, is_active: true };
      case "inactive":
        return { ...baseFilter, is_active: false };
      case "individual":
        return { ...baseFilter, partner_type: "individual" };
      case "businesses":
        return { ...baseFilter, partner_type: "business" };
      case "pickup_points":
        return { ...baseFilter, partner_type: "pickup_point" };
      case "un_verified":
        return { ...baseFilter, kyc_verified: false };
      default:
        return baseFilter;
    }
  };

  useEffect(() => {
    const fetchPartnersData = async () => {
      try {
        setIsTabLoading(true);
        const filters = getFilters();
        const data = await fetchDeliveryPartners(filters, tenantHeaders);
        if (data && data.items !== undefined && data.total !== undefined) {
          setCurrentPartnersData(data);
        }
      } catch (error) {
        console.error("Error fetching delivery partners:", error);
      } finally {
        setIsTabLoading(false);
      }
    };

    if (tenantId) {
      fetchPartnersData();
    }
  }, [fetchDeliveryPartners, activeTab, currentPage, searchQuery, tenantId]);

  const handlePartnerClick = (partner: DeliveryPartner) => {
    router.push(`/dashboard/delivery-partners/${partner.partner_id}`);
  };

  const handlePartnerEdit = (partner: DeliveryPartner) => {
    router.push(`/dashboard/delivery-partners/${partner.partner_id}/edit`);
  };

  const handleStatusChange = async (partnerId: string, payload: any) => {
    try {
      await updateDeliveryPartner(partnerId, payload, tenantHeaders);
      toast.success("Partner status updated successfully.");
      const data = await fetchDeliveryPartners(getFilters(), tenantHeaders);
      if (data) {
        setCurrentPartnersData(data);
      }
    } catch (error) {
      console.error("Failed to update partner status:", error);
      toast.error("Failed to update partner status");
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const filteredPartners = currentPartnersData?.items || [];

  if (loading && currentPartnersData.items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Delivery Partners</h1>
            <p className="text-muted-foreground">Manage delivery partner applications and accounts</p>
          </div>
          <Can permission="delivery-partners:create">
            <Button onClick={() => router.push("/dashboard/delivery-partners/add")}>
              <Plus className="mr-2 h-4 w-4" /> Add Delivery Partner
            </Button>
          </Can>
        </div>
        <div className="flex items-center justify-center p-8">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!currentPartnersData.items.length && !loading && storeError) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Delivery Partners</h1>
            <p className="text-muted-foreground">Manage delivery partner applications and accounts</p>
          </div>
          <Can permission="delivery-partners:create">
            <Button onClick={() => router.push("/dashboard/delivery-partners/add")}>
              <Plus className="mr-2 h-4 w-4" /> Add Delivery Partner
            </Button>
          </Can>
        </div>
        <div className="p-4">
          <ErrorCard
            title="Failed to load delivery partners"
            error={{
              status: storeError.status?.toString() || "Error",
              message: storeError.message || "An error occurred",
            }}
            buttonText="Retry"
            buttonAction={() => fetchDeliveryPartners(getFilters(), tenantHeaders)}
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
          <h1 className="text-2xl font-bold tracking-tight">Delivery Partners</h1>
          <p className="text-muted-foreground">Manage delivery partner applications and accounts</p>
        </div>
        <Can permission="delivery-partners:create">
          <Button onClick={() => router.push("/dashboard/delivery-partners/add")}>
            <Plus className="mr-2 h-4 w-4" /> Add Delivery Partner
          </Button>
        </Can>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between mb-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search delivery partners..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="all">All Partners</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="businesses">Businesses</TabsTrigger>
            <TabsTrigger value="pickup_points">Pickup Points</TabsTrigger>
            <TabsTrigger value="un_verified">Unverified</TabsTrigger>
          </TabsList>

          {isTabLoading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <DeliveryPartnerTable
              deliveryPartners={filteredPartners}
              onPartnerClick={handlePartnerClick}
              onPartnerEdit={handlePartnerEdit}
              onStatusChange={handleStatusChange}
              activeTab={activeTab}
            />
          )}
          {currentPartnersData.items.length > 0 && (
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={currentPartnersData.total}
              onPageChange={(page: number) => setCurrentPage(page)}
            />
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default withAuthorization(DeliveryPartnersPage, { permission: "delivery-partners:read" });
