"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  X,
  Edit,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileText,
  CreditCard,
  Building,
  User,
  Store as StoreIcon,
  Link as LinkIcon,
  ExternalLink,
  Settings,
  Info,
  History,
  CalendarDays,
  Copy,
  Power,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { useAffiliateStore } from "@/features/affiliates/store";
import {
  Affiliate,
  VerificationDocument,
  VendorPartnerRequest,
  AffiliateLink,
} from "@/features/affiliates/types";
import { AffiliateRejectionDialog, AffiliateRequestsTable, AffiliateLinksTable } from "@/features/affiliates/components";
import { FilePreviewModal } from "@/components/ui/file-preview-modal";
import { VerificationDocumentManager } from "@/components/ui/verification-document-manager";
import { isImageFile, isPdfFile } from "@/lib/services/file-upload.service";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/ui/pagination";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

// Memoized VendorsTab component to prevent unnecessary re-renders
const VendorsTab = React.memo(function VendorsTab({
  affiliateId,
  tenantId,
}: {
  affiliateId: string;
  tenantId?: string;
}) {
  // Use a ref to store the current state without causing re-renders
  const stateRef = useRef({
    searchQuery: "",
    activeTab: "all",
    pagination: {
      skip: 0,
      limit: 10,
      total: 0,
    },
  });

  const [requests, setRequests] = useState<any[]>([]); // Use any[] to avoid AffiliateRequest error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async (pageArg = page, searchArg = search) => {
    let isMounted = true;
    const fetchRequest = async () => {
      try {
        setLoading(true);
        const headers = tenantId ? { "X-Tenant-ID": tenantId } : {};
        const { activeTab } = stateRef.current;
        const filters = {
          affiliate_id: affiliateId,
          skip: (pageArg - 1) * pageSize,
          limit: pageSize,
          ...(searchArg && { search: searchArg }),
          ...(activeTab !== "all" && { status: activeTab }),
        };
        const { fetchAffiliateRequests } = useAffiliateStore.getState();
        const result = await fetchAffiliateRequests(filters, headers) as any;
        if (!isMounted) return;
        setRequests(result?.requests || []);
        setTotal(result?.total || 0);
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;
        setRequests([]);
        setTotal(0);
        setError({
          message: err.message || 'Failed to fetch vendor partners',
          status: err.status,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    const timer = setTimeout(fetchRequest, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [affiliateId, tenantId, page, pageSize, search]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    fetchData(1, e.target.value);
  }, [fetchData]);

  const handleTabChange = useCallback((value: string) => {
    stateRef.current.activeTab = value;
    setPage(1);
    fetchData(1, search);
  }, [fetchData, search]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    fetchData(newPage, search);
  }, [fetchData, search]);

  useEffect(() => {
    const cleanup = fetchData();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [fetchData]);

  const handleStatusChange = async (requestId: string, status: string, reason?: string) => {
    try {
      setLoading(true);
      const headers = tenantId ? { "X-Tenant-ID": tenantId } : {};

      // Make API call to update the request status
      const response = await fetch(`/api/affiliates/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          status,
          ...(reason && { rejection_reason: reason })
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update request status');
      }

      // Update the local state to reflect the change
      setRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? {
              ...req,
              status,
              ...(reason && { rejection_reason: reason })
            }
            : req
        )
      );

      // Show success message
      // You can add a toast notification here if needed
    } catch (error) {
      console.error('Failed to update request status:', error);
      setError({
        message: 'Failed to update request status',
        status: 500,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TabsContent value="vendors" className="space-y-4 mt-4">
      <div className="flex justify-between mb-4">
        <div className="relative w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendors..."
            className="pl-8"
            value={search}
            onChange={handleSearchChange}
            disabled={loading}
          />
        </div>
      </div>
      <Tabs value={stateRef.current.activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorCard
            title="Failed to Load Vendor Partners"
            error={{
              status: error.status?.toString() || "Error",
              message:
                error.message ||
                "An unexpected error occurred while loading vendor partners.",
            }}
            buttonText="Retry"
            buttonAction={() => handlePageChange(1)}
            buttonIcon={RefreshCw}
          />
        ) : (
          <>
            <AffiliateRequestsTable requests={requests} />
            <Pagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Tabs>
    </TabsContent>
  );
});

function AffiliateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenant_id;

  const id = params.id;

  // Destructure store state and actions
  const {
    affiliate,
    loading,
    error: storeError,
    fetchAffiliate,
    updateAffiliateStatus,
  } = useAffiliateStore();

  // UI States
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    null | "approve" | "reject" | "activate" | "deactivate"
  >(null);

  // Document and Verification States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);
  const [verificationDoc, setVerificationDoc] =
    useState<VerificationDocument | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  // Affiliate Links State
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [linksTotal, setLinksTotal] = useState(0);
  const [linksPage, setLinksPage] = useState(1);
  const [linksPageSize] = useState(10);
  const [linksSearch, setLinksSearch] = useState("");
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksActiveTab, setLinksActiveTab] = useState('all');

  // Fetch affiliate links
  const fetchLinks = useCallback(
    async (page = linksPage, search = linksSearch, activeTab = linksActiveTab) => {
      if (!affiliate?.id || !tenantId) return;
      setLinksLoading(true);
      setLinksError(null);
      try {
        const { fetchAffiliateLinks } = useAffiliateStore.getState();
        const filters: any = {
          skip: (page - 1) * linksPageSize,
          limit: linksPageSize,
          ...(search ? { search } : {}),
        };
        if (activeTab === 'active') filters.is_active = true;
        if (activeTab === 'inactive') filters.is_active = false;
        const { links, total } = await fetchAffiliateLinks(
          affiliate.id,
          filters,
          { "X-Tenant-ID": tenantId }
        );
        setLinks(links);
        setLinksTotal(total);
      } catch (err: any) {
        setLinksError(err?.message || 'Failed to fetch affiliate links');
      } finally {
        setLinksLoading(false);
      }
    },
    [affiliate?.id, tenantId, linksPage, linksPageSize, linksSearch, linksActiveTab]
  );

  useEffect(() => {
    if (affiliate?.id && tenantId) {
      fetchLinks();
    }
  }, [affiliate?.id, tenantId, fetchLinks]);

  const handleLinksPageChange = (page: number) => {
    setLinksPage(page);
    fetchLinks(page, linksSearch, linksActiveTab);
  };
  const handleLinksSearchChange = (value: string) => {
    setLinksSearch(value);
    setLinksPage(1);
    fetchLinks(1, value, linksActiveTab);
  };
  const handleLinksTabChange = (tab: string) => {
    setLinksActiveTab(tab);
    setLinksPage(1);
    fetchLinks(1, linksSearch, tab);
  };

  // Define tenant headers
  const tenantHeaders = {
    "X-Tenant-ID": tenantId,
  };

  // Fetch affiliate by id ONCE
  useEffect(() => {
    if (id && tenantId) {
      fetchAffiliate(id, tenantHeaders);
    }
  }, [id, tenantId, fetchAffiliate]);

  // Unified status change handler
  const handleStatusChange = async (
    action: "approve" | "reject" | "activate" | "deactivate",
    reason?: string
  ) => {
    if (!affiliate?.id) return;
    setIsUpdating(true);
    try {
      let statusData: any = {};
      switch (action) {
        case "approve":
          statusData = { status: "approved", is_active: true };
          break;
        case "reject":
          statusData = { status: "rejected", rejection_reason: reason };
          break;
        case "activate":
          statusData = { is_active: true };
          break;
        case "deactivate":
          statusData = { is_active: false, status: "inactive" };
          break;
      }
      const result = await updateAffiliateStatus(
        affiliate.id,
        statusData,
        tenantHeaders
      );
      if (result) {
        await fetchAffiliate(affiliate.id, tenantHeaders); // Only update the current affiliate
        toast.success(`Affiliate status updated successfully`);
      } else {
        toast.error(`Failed to ${action} affiliate`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} affiliate`);
    } finally {
      setIsUpdating(false);
      setShowRejectDialog(false);
      setPendingAction(null);
    }
  };

  // Button handlers
  const handleApprove = () => handleStatusChange("approve");
  const handleActivate = () => handleStatusChange("activate");
  const handleDeactivate = () => handleStatusChange("deactivate");
  const handleReject = () => {
    setShowRejectDialog(true);
    setPendingAction("reject");
  };

  const handleEdit = () => {
    router.push(`/dashboard/affiliates/${id}/edit`);
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-amber-500 border-amber-200 bg-amber-50"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="text-green-500 border-green-200 bg-green-50"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="text-red-500 border-red-200 bg-red-50"
          >
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Local date formatting function to replace the imported one
  const formatDate = (date: string | Date): string => {
    if (!date) return "N/A";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "Invalid Date";
    }

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    return new Intl.DateTimeFormat("en-US", options).format(dateObj);
  };

  if (loading && !affiliate) {
    return <Spinner />;
  }

  if (!affiliate && storeError) {
    console.log("Render case: Affiliate not found");
    return (
      <ErrorCard
        title="Affiliate Not Found"
        error={{
          status: "404",
          message: `The affiliate with ID "${id}" could not be found.`,
        }}
        buttonText="Go Back"
        buttonAction={() => router.back()}
        buttonIcon={ArrowLeft}
      />
    );
  }

  // Main content for an existing affiliate
  return affiliate ? (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/affiliates")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback style={{ backgroundColor: "#4f46e5" }}>
                {getInitials(affiliate?.name || "W")}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {affiliate?.name}
              </h1>
              {affiliate?.website && (
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <a
                    href={
                      affiliate.website.startsWith("http")
                        ? affiliate?.website
                        : `https://${affiliate.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center"
                  >
                    {affiliate?.website}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              affiliate?.status === "approved"
                ? "default"
                : affiliate?.status === "rejected"
                  ? "destructive"
                  : "outline"
            }
            className={
              affiliate?.status === "approved"
                ? "bg-green-500 hover:bg-green-600 px-2 py-1"
                : affiliate?.status === "rejected"
                  ? "px-2 py-1"
                  : "text-amber-500 border-amber-200 bg-amber-50 px-2 py-1"
            }
          >
            {affiliate?.status === "approved"
              ? "Approved"
              : affiliate?.status === "rejected"
                ? "Rejected"
                : "Pending"}
          </Badge>

          <div className="flex items-center gap-2 ml-2">
            <Can permission="affiliate:update">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {/* Main Content - 5 columns */}
          <div className="md:col-span-5 space-y-6">
            <Tabs
              defaultValue="overview"
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="gap-1">
                  <User className="h-4 w-4" /> Overview
                </TabsTrigger>
                <TabsTrigger value="vendors" className="gap-1">
                  <StoreIcon className="h-4 w-4" /> Vendor Partners
                </TabsTrigger>
                <TabsTrigger value="links" className="gap-1">
                  <LinkIcon className="h-4 w-4" /> Affiliate Links
                </TabsTrigger>
              </TabsList>

              <OverviewTab />
              <VendorsTab affiliateId={affiliate.id} tenantId={tenantId} />
              <TabsContent value="links" className="space-y-4 mt-4">
                {linksLoading ? (
                  <Spinner />
                ) : linksError ? (
                  <ErrorCard
                    title="Failed to Load Affiliate Links"
                    error={{
                      status: "Error",
                      message: linksError,
                    }}
                    buttonText="Retry"
                    buttonAction={() => fetchLinks()}
                    buttonIcon={RefreshCw}
                  />
                ) : (
                  <AffiliateLinksTable
                    links={links}
                    total={linksTotal}
                    page={linksPage}
                    pageSize={linksPageSize}
                    onPageChange={handleLinksPageChange}
                    search={linksSearch}
                    onSearchChange={handleLinksSearchChange}
                    activeTab={linksActiveTab}
                    onTabChange={handleLinksTabChange}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          <Sidebar />
        </div>
      </div>

      <AffiliateRejectionDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={(reason, customReason) => {
          if (!reason && !customReason) {
            toast.error("Please provide a rejection reason.");
            return;
          }
          handleStatusChange("reject", reason === "other" ? customReason : reason);
        }}
        loading={isUpdating}
        title="Reject Affiliate"
        description="Please provide a reason for rejecting this affiliate. This information may be shared with the affiliate."
        actionText="Reject"
      />
    </div>
  ) : null;

  function OverviewTab() {
    return (
      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Affiliate Profile Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Affiliate Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-2">
                  <AvatarFallback className="text-lg">
                    {getInitials(affiliate?.name || "W")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-medium">{affiliate?.name}</h3>
                <p className="text-sm text-muted-foreground">Affiliate</p>
                {affiliate?.status && (
                  <Badge
                    variant="outline"
                    className={`mt-2 ${affiliate?.status === "approved"
                      ? "text-green-600 border-green-200 bg-green-50"
                      : affiliate?.status === "rejected"
                        ? "text-red-600 border-red-200 bg-red-50"
                        : "text-amber-600 border-amber-200 bg-amber-50"
                      }`}
                  >
                    {affiliate?.status.charAt(0).toUpperCase() +
                      affiliate?.status.slice(1)}
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                {affiliate?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${affiliate?.email}`}
                      className="text-sm hover:underline"
                    >
                      {affiliate?.email}
                    </a>
                  </div>
                )}

                {affiliate?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${affiliate?.phone}`}
                      className="text-sm hover:underline"
                    >
                      {affiliate?.phone}
                    </a>
                  </div>
                )}

                {affiliate?.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={
                        affiliate?.website.startsWith("http")
                          ? affiliate?.website
                          : `https://${affiliate.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline flex items-center gap-1"
                    >
                      {affiliate?.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Default Commission
                  </span>
                  <Badge variant="outline" className="font-normal">
                    N/A
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Joined
                  </span>
                  <span className="text-sm">
                    {affiliate?.created_at
                      ? formatDate(affiliate?.created_at)
                      : "N/A"}
                  </span>
                </div>

                {affiliate?.updated_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Last Updated
                    </span>
                    <span className="text-sm">
                      {formatDate(affiliate.updated_at)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium w-full">
                    Affiliate ID
                  </span>
                  <span className="text-sm font-mono inline-flex items-center gap-2 truncate max-w-xs">
                    <span className="truncate">{affiliate?.id || "N/A"}</span>
                    <Copy
                      className="h-4 w-4 shrink-0 cursor-pointer"
                      onClick={() =>
                        navigator.clipboard.writeText(affiliate?.id || "N/A")
                      }
                    />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content - Details */}
          <div className="col-span-2 space-y-6">
            {/* Biography Card */}
            {affiliate?.bio && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Biography
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {affiliate.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Bank Account Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Banking Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {affiliate?.bank_account ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Bank Name</p>
                        <p className="text-sm">
                          {affiliate?.bank_account.bank_name}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Account Name</p>
                        <p className="text-sm">
                          {affiliate?.bank_account.account_name}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Account Number</p>
                        <p className="text-sm font-mono">
                          {affiliate?.bank_account.account_number}
                        </p>
                      </div>

                      {affiliate?.bank_account.swift_bic && (
                        <div>
                          <p className="text-sm font-medium">SWIFT/BIC</p>
                          <p className="text-sm font-mono">
                            {affiliate?.bank_account.swift_bic}
                          </p>
                        </div>
                      )}

                      {affiliate?.bank_account.branch_code && (
                        <div>
                          <p className="text-sm font-medium">Branch Code</p>
                          <p className="text-sm font-mono">
                            {affiliate?.bank_account.branch_code}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No banking information provided.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
    );
  }

  function Sidebar() {
    return (
      <div className="md:col-span-2 space-y-6">
        {/* Verification Documents Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Verification Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VerificationDocumentManager
              documents={affiliate?.verification_documents || []}
              onApprove={async (documentId) => {
                if (affiliate?.id) {
                  await updateAffiliateStatus(
                    affiliate.id,
                    { status: "approved", is_active: true },
                    tenantHeaders
                  );
                  fetchAffiliate(affiliate.id, tenantHeaders);
                }
              }}
              onReject={async (documentId, reason) => {
                if (affiliate?.id) {
                  await updateAffiliateStatus(
                    affiliate.id,
                    { status: "rejected", rejection_reason: reason },
                    tenantHeaders
                  );
                  fetchAffiliate(affiliate.id, tenantHeaders);
                }
              }}
              showActions={affiliate?.status === "pending"}
            />
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader className="">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {affiliate?.status === "pending" && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Verification</h4>
                <div className="flex flex-col gap-2">
                  <Can permission="affiliate:approve">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700 w-full justify-start"
                      onClick={handleApprove}
                      disabled={isUpdating}
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve Affiliate
                    </Button>
                  </Can>
                  <Can permission="affiliate:reject">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 w-full justify-start"
                      onClick={handleReject}
                      disabled={isUpdating}
                    >
                      <X className="h-4 w-4 mr-2" /> Reject Affiliate
                    </Button>
                  </Can>
                </div>
              </div>
            )}

            {/* {affiliate?.status === "approved" && affiliate.is_active && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 w-full justify-start"
                    onClick={handleDeactivate}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4 mr-2" /> Deactivate Affiliate
                  </Button>
                </div>
              </div>
            )}

            {affiliate?.status === "approved" && !affiliate.is_active && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-500 border-green-300 hover:bg-green-50 hover:text-green-600 w-full justify-start"
                    onClick={handleActivate}
                    disabled={isUpdating}
                  >
                    <Power className="h-4 w-4 mr-2" /> Activate Affiliate
                  </Button>
                </div>
              </div>
            )} */}

            {affiliate?.status === "approved" && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <Can permission="affiliate:update">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 w-full justify-start"
                      onClick={handleReject}
                      disabled={isUpdating}
                    >
                      <X className="h-4 w-4 mr-2" /> Reject Affiliate
                    </Button>
                  </Can>
                </div>
              </div>
            )}

            {affiliate?.status === "rejected" && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <Can permission="affiliate:update">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-500 border-green-300 hover:bg-green-50 hover:text-green-600 w-full justify-start"
                      onClick={handleApprove}
                      disabled={isUpdating}
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve Affiliate
                    </Button>
                  </Can>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-col gap-2">
                <Can permission="affiliate:update">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit Affiliate
                  </Button>
                </Can>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default withAuthorization(AffiliateDetailPage, { permission: "affiliate:read" });
