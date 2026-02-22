"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use } from "react";
import {
  ArrowLeft,
  Check,
  X,
  Edit,
  Store as StoreIcon,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileText,
  Building,
  Landmark,
  Star,
  Trash2,
  Image as ImageIcon,
  Briefcase,
  LinkIcon,
  Clock,
  Download,
  Upload,
  Power,
  Ban,
  PlayCircle,
  Truck,
  FileTerminal,
  Banknote,
  ShoppingCart,
  RefreshCw,
  UserRoundPlus,
  Package,
  Percent,
  Search,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { useVendorStore } from "@/features/vendors/store";
import { useCategoryStore } from "@/features/categories/store";
import { useModules } from "@/features/auth/hooks/use-modules";
import {
  VerificationDocument,
  Store as VendorStore,
  VendorPerformanceData,
} from "@/features/vendors/types";
import { FilePreviewModal } from "@/components/ui/file-preview-modal";
import { VerificationDocumentManager, VerificationActionPayload } from "@/components/ui/verification-document-manager";
import { BannerEditor } from "@/components/ui/banner-editor";
import { VendorRejectionModal } from "@/features/vendors/components/vendor-rejection-modal";
import { useAffiliateStore } from "@/features/affiliates/store";
import { AffiliateRequestsTable } from "@/features/affiliates/components/affiliate-requests-table";

interface VendorPageProps {
  params: {
    id: string;
  };
}

interface AffiliatesTabProps {
  vendorId: string;
  tenantId?: string;
}

function VendorPage({ params }: VendorPageProps) {
  const router = useRouter();
  const session = useSession();
  // Extract tenant ID from session if available
  const tenant_id = (session?.data?.user as any)?.tenant_id as string | undefined;

  const { isModuleEnabled } = useModules();
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const {
    vendor,
    loading,
    error,
    fetchVendor,
    updateVendorStatus,
    updateVendorDocumentStatus,
    fetchStoreByVendor,
    updateStore,
    vendorPerformanceReport,
    fetchVendorPerformanceReport,
    activeAction,
  } = useVendorStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [storeData, setStoreData] = useState<VendorStore[] | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // UI States
  const [rejectProcessing, setRejectProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // File preview state for the new VerificationDocumentCard
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [policyDocUrl, setPolicyDocUrl] = useState("");

  // Define tenant headers
  const tenantHeaders = tenant_id ? { "X-Tenant-ID": tenant_id } : undefined;

  // Use ref to prevent duplicate API calls
  const fetchRequestRef = useRef(false);

  // Categories loading state
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Fetch all categories for mapping IDs to names
  const {
    categories: storeCategories,
    loading: storeCategoriesLoading,
    fetchCategories: fetchStoreCategories,
  } = useCategoryStore();

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      // Use the categories store to fetch all categories
      await fetchStoreCategories({}, tenantHeaders as Record<string, string>);
    } catch (error) {
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Get category name by ID using the appropriate categories store
  const getCategoryName = (categoryId: string) => {
    // Default fallback to ID if category not found
    if (!storeCategories || storeCategories.length === 0) {
      return categoryId;
    }

    // Find the category by ID
    const category = storeCategories.find(
      (cat) =>
        cat.id === categoryId ||
        cat.category_id === categoryId ||
        cat._id === categoryId
    );

    // Return the name if found, otherwise return the ID
    return category ? category.name : categoryId;
  };

  useEffect(() => {
    // Only fetch if not already fetched
    if (!fetchRequestRef.current) {
      fetchRequestRef.current = true;

      // First fetch the vendor data
      fetchVendor(id, tenantHeaders)
        .then(() => {
          // Then fetch the store data using the vendor ID with limit:1
          setStoreLoading(true);
          // Pass headers as the second parameter, limit as the third parameter
          return fetchStoreByVendor(id, tenantHeaders, 1);
        })
        .then((storeResponse) => {
          // Handle the store response as an array
          if (Array.isArray(storeResponse)) {
            setStoreData(storeResponse);
          } else {
            // Handle backwards compatibility if the response is a single object
            setStoreData([storeResponse]);
          }
          // Also fetch categories for mapping
          return fetchCategories();
        })
        .catch((error) => {
        })
        .finally(() => {
          setStoreLoading(false);
        });
    }
  }, [id, fetchVendor, fetchStoreByVendor]);

  useEffect(() => {
    if (id && tenant_id) {
      const headers = { 'X-Tenant-ID': tenant_id };
      fetchVendorPerformanceReport(id as string, headers);
    }
  }, [id, tenant_id, fetchVendorPerformanceReport]);

  const performanceStats = useMemo(() => {
    if (!vendorPerformanceReport || !Array.isArray(vendorPerformanceReport) || vendorPerformanceReport.length === 0) {
      return {
        totalRevenue: { value: 0, change: 0 },
        totalOrders: { value: 0, change: 0 },
        totalItemsSold: { value: 0, change: 0 },
      };
    }

    const sortedReports = [...vendorPerformanceReport].sort(
      (a, b) =>
        new Date(b.performance_date).getTime() -
        new Date(a.performance_date).getTime()
    );

    const calculateTotals = (reports: VendorPerformanceData[]) => {
      return reports.reduce(
        (acc, report) => {
          acc.revenue += report.vendor_gmv || 0;
          acc.orders += report.order_count || 0;
          acc.itemsSold += report.items_sold || 0;
          return acc;
        },
        { revenue: 0, orders: 0, itemsSold: 0 }
      );
    };

    const allTimeTotals = calculateTotals(sortedReports);

    const currentPeriodData = sortedReports.slice(0, 7);
    const previousPeriodData = sortedReports.slice(7, 14);

    const currentPeriodTotals = calculateTotals(currentPeriodData);
    const previousPeriodTotals = calculateTotals(previousPeriodData);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    };

    return {
      totalRevenue: {
        value: allTimeTotals.revenue,
        change: calculateChange(
          currentPeriodTotals.revenue,
          previousPeriodTotals.revenue
        ),
      },
      totalOrders: {
        value: allTimeTotals.orders,
        change: calculateChange(
          currentPeriodTotals.orders,
          previousPeriodTotals.orders
        ),
      },
      totalItemsSold: {
        value: allTimeTotals.itemsSold,
        change: calculateChange(
          currentPeriodTotals.itemsSold,
          previousPeriodTotals.itemsSold
        ),
      },
    };
  }, [vendorPerformanceReport]);

  // Get badge variant for status based on vendor status
  const getStatusVariant = (
    status: string
  ):
    | "default"
    | "outline"
    | "secondary"
    | "success"
    | "warning"
    | "destructive" => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "inactive":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Get badge custom class for status (for additional styling)
  const getBadgeStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "inactive":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Helper to safely access vendor properties with appropriate fallbacks
  const categoriesStore = useCategoryStore();
  const vendorStatus = vendor?.verification_status || (vendor?.is_active ? "active" : "pending");
  const vendorEmail = vendor?.contact_email || vendor?.email || "";
  // Get the first store from the array if available
  const firstStore = storeData && storeData.length > 0 ? storeData[0] : null;
  const vendorLogo = firstStore?.branding?.logo_url || "/placeholder.svg";

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not specified";
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Handle status change
  const handleStatusChange = async (status: string) => {
    try {
      setIsUpdating(true);
      // Handle different status updates according to API expectations
      if (status === "active" || status === "inactive") {
        // For active/inactive toggle, API expects is_active: true/false
        const isActive = status === "active";
        await updateVendorStatus(
          id,
          status,
          tenantHeaders,
          undefined,
          isActive
        );
        toast.success(
          `Vendor ${isActive ? "activated" : "deactivated"} successfully`
        );
      } else if (status === "approved") {
        // For approval, API expects status: "approved", is_active: false
        await updateVendorStatus(id, status, tenantHeaders);
        toast.success("Vendor approved successfully");
      } else {
        // For other status changes
        await updateVendorStatus(id, status, tenantHeaders);
        toast.success(`Vendor status updated to ${status} successfully`);
      }
      // Refresh vendor data
      fetchVendor(id, tenantHeaders);
    } catch (error) {
      toast.error("Failed to update vendor status");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle document verification
  const handleDocumentVerification = useCallback(async (payload: VerificationActionPayload) => {
    if (!vendor) {
      toast.error("Verification failed: Vendor data not available.");
      return;
    }
    if (!tenant_id) {
      toast.error("Verification failed: User session is invalid.");
      return;
    }

    setIsUpdating(true);
    const action = payload.verification_status === 'verified' ? 'Approving' : 'Rejecting';
    const toastId = toast.loading(`${action} document...`);

    try {
      await updateVendorDocumentStatus(
        vendor.vendor_id,
        payload,
        { "X-Tenant-ID": tenant_id }
      );
      toast.success(`Document ${payload.verification_status === 'verified' ? 'approved' : 'rejected'} successfully.`, { id: toastId });
    } catch (error) {
      toast.error(`Failed to ${action.toLowerCase()} document.`, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  }, [vendor, tenant_id, updateVendorDocumentStatus]);

  // Handle the rejection confirmation similar to vendor-table
  const handleRejectConfirm = ({ type, customReason }: { type: string; customReason?: string }) => {
    if (!vendor) return;
    const reason = type === 'other' ? customReason : type;
    if (!reason) {
      toast.error("Rejection reason required");
      return;
    }
    setRejectProcessing(true);
    updateVendorStatus(vendor.id || vendor.vendor_id!, 'rejected', tenantHeaders, reason)
      .then(() => {
        toast.success("Vendor rejected successfully");
        setShowRejectDialog(false);

        // Refresh vendor data
        fetchVendor(id, tenantHeaders);
      })
      .catch(() => toast.error("Failed to reject vendor"))
      .finally(() => setRejectProcessing(false));
  };

  const handleDeleteVendor = async () => {
    try {
      setIsDeleting(true);
      // This would connect to your API
      // In a real app, you would delete the vendor
      // await deleteVendor(id);
      toast.success("Vendor deleted successfully");

      // Redirect back to vendors list
      router.push("/dashboard/vendors");
    } catch (error) {
      toast.error("Failed to delete vendor");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading && !vendor) {
    return <Spinner />;
  }

  if (!vendor && error) {
    return (
      <ErrorCard
        title="Failed to load vendor"
        error={error || { message: "Vendor not found", status: "404" }}
        buttonText="Back to Vendors"
        buttonAction={() => router.push("/dashboard/vendors")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  const canManageVendor = true;

  return vendor ? (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/vendors")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={vendorLogo} alt={vendor.business_name} />
              <AvatarFallback>
                {vendor.business_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {vendor.business_name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge
                  variant={getStatusVariant(vendorStatus)}
                  className={`${getBadgeStyles(vendorStatus)}`}
                >
                  {vendorStatus.charAt(0).toUpperCase() + vendorStatus.slice(1)}
                </Badge>
                <Badge
                  variant={vendor.is_active ? "success" : "secondary"}
                  className={vendor.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}
                >
                  {vendor.is_active ? "Active" : "Inactive"}
                </Badge>
                {vendor.website && (
                  <a
                    href={
                      vendor.website.startsWith("http")
                        ? vendor.website
                        : `https://${vendor.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center"
                  >
                    <Globe className="h-3 w-3 mr-1" />
                    {vendor.website.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Can permission="vendors:update">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/vendors/${id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Can>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {/* Main Content Area */}
          <div className="md:col-span-5">
            <Tabs defaultValue="vendor" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="vendor" className="flex items-center gap-2">
                  <Building className="h-4 w-4" /> Vendor Information
                </TabsTrigger>
                <TabsTrigger value="store" className="flex items-center gap-2">
                  <StoreIcon className="h-4 w-4" /> Store Information
                </TabsTrigger>
                {isModuleEnabled('affiliates') && (
                  <TabsTrigger
                    value="affiliate"
                    className="flex items-center gap-2"
                  >
                    <UserRoundPlus className="h-4 w-4" /> Affiliates
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Vendor Information Tab */}
              <VendorInfoTab />

              {/* Store Information Tab */}
              <StoreInfoTab />

              {/* Affiliates Information Tab */}
              {isModuleEnabled('affiliates') && (
                <AffiliatesTab vendorId={id} tenantId={tenant_id} />
              )}
            </Tabs>
          </div>

          {/* Sidebar */}
          <Sidebar />
        </div>
      </div>

      {/* File Preview Modal for Verification Documents */}
      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        src={policyDocUrl}
        alt="Verification document preview"
      />


      {/* Rejection Dialog */}
      <VendorRejectionModal
        isOpen={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={handleRejectConfirm}
      />
    </div>
  ) : null;

  function VendorInfoTab() {
    const StatCard = ({ title, value, icon: Icon, change, changePeriod = "from last week" }) => {
      const changeType = change >= 0 ? "increase" : "decrease";
      const formattedChange = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;

      return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className={`text-xs ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
              <span className="font-semibold">{formattedChange}</span>
              <span className="text-muted-foreground ml-1">{changePeriod}</span>
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <TabsContent value="vendor" className="space-y-4 mt-4">
        {/* Vendor Performance Report Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && activeAction === 'fetchPerformance' ? (
            <>
              <div className="h-28 w-full bg-muted rounded-lg animate-pulse" />
              <div className="h-28 w-full bg-muted rounded-lg animate-pulse" />
              <div className="h-28 w-full bg-muted rounded-lg animate-pulse" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Revenue"
                value={`TZS ${performanceStats.totalRevenue.value.toLocaleString()}`}
                icon={Banknote}
                change={performanceStats.totalRevenue.change}
              />
              <StatCard
                title="Total Orders"
                value={performanceStats.totalOrders.value.toLocaleString()}
                icon={ShoppingCart}
                change={performanceStats.totalOrders.change}
              />
              <StatCard
                title="Items Sold"
                value={performanceStats.totalItemsSold.value.toLocaleString()}
                icon={Package}
                change={performanceStats.totalItemsSold.change}
              />
            </>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof vendor?.commission_rate === "number"
                  ? `${vendor.commission_rate}%`
                  : vendor?.commission_rate
                    ? `${vendor.commission_rate}`
                    : "0%"}
              </div>
              <p className="text-xs text-muted-foreground">Current rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Business Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Business Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Business Name
                </p>
                <p>{vendor?.business_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Display Name
                </p>
                <p>{vendor?.display_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Tax ID
                </p>
                <p>{vendor?.tax_id || "Not provided"}</p>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-medium mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${vendorEmail}`}
                    className="text-sm hover:underline"
                  >
                    {vendorEmail}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${vendor?.contact_phone}`}
                    className="text-sm hover:underline"
                  >
                    {vendor?.contact_phone}
                  </a>
                </div>
                {vendor?.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                    >
                      {vendor.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Address Information */}
            <div>
              <h3 className="text-sm font-medium mb-3">Address</h3>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm">{vendor?.address_line1}</p>
                  {vendor?.address_line2 && (
                    <p className="text-sm">{vendor.address_line2}</p>
                  )}
                  <p className="text-sm">
                    {[vendor?.city, vendor?.state_province, vendor?.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="text-sm font-medium">{vendor?.country}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Landmark className="h-5 w-5 mr-2" />
              Banking Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Bank Name
                </p>
                <p>{vendor?.bank_account?.bank_name || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Account Name
                </p>
                <p>{vendor?.bank_account?.account_name || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Account Number
                </p>
                <p>{vendor?.bank_account?.account_number || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Swift/BIC Code
                </p>
                <p>{vendor?.bank_account?.swift_bic || "Not provided"}</p>
              </div>
              {vendor?.bank_account?.branch_code && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Branch Code
                  </p>
                  <p>{vendor.bank_account.branch_code}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    );
  }

  function StoreInfoTab() {
    return (
      <TabsContent value="store" className="space-y-4 mt-4">
        {storeData && storeData.length > 0 ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <StoreIcon className="h-5 w-5 mr-2" />
                  Store Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Store Details */}
                <div>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Store Name
                    </p>
                    <p>{storeData[0]?.store_name}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm">
                      {storeData[0]?.description || "No description provided"}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Store Categories */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {storeData[0]?.categories &&
                      storeData[0].categories.length > 0 ? (
                      storeData[0].categories.map((category, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs py-0.5"
                        >
                          {getCategoryName(category)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No categories assigned
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Store Policies */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Store Policies
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center p-3 rounded-md bg-muted/50">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Return Policy</p>
                        {storeData[0]?.return_policy ? (
                          <button
                            onClick={() => {
                              setPolicyDocUrl(storeData[0].return_policy || "");
                              setIsPreviewOpen(true);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Document
                          </button>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Not provided
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center p-3 rounded-md bg-muted/50">
                      <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Shipping Policy</p>
                        {storeData[0]?.shipping_policy ? (
                          <button
                            onClick={() => {
                              setPolicyDocUrl(
                                storeData[0].shipping_policy || ""
                              );
                              setIsPreviewOpen(true);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Document
                          </button>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Not provided
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center p-3 rounded-md bg-muted/50">
                      <FileTerminal className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">
                          Terms & Conditions
                        </p>
                        {storeData[0]?.general_policy ? (
                          <button
                            onClick={() => {
                              setPolicyDocUrl(
                                storeData[0].general_policy || ""
                              );
                              setIsPreviewOpen(true);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Document
                          </button>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Not provided
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Store Banners */}
                <div>
                  <h3 className="text-sm font-medium mb-4">Store Banners</h3>
                  {!storeData[0]?.banners ||
                    storeData[0].banners.length === 0 ? (
                    <div className="bg-muted/20 rounded-md p-6 text-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">
                        No banners found.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          // Implement banner add functionality
                          router.push(
                            `/dashboard/vendors/${id}/edit?tab=store`
                          );
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Banners
                      </Button>
                    </div>
                  ) : (
                    <BannerEditor
                      banners={storeData[0].banners}
                      resourceId={storeData[0].store_id}
                      entityId={vendor?.vendor_id}
                      readOnly={true}
                      onChange={() => { }}
                      className="max-h-[500px] overflow-y-auto"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <StoreIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No store data available for this vendor.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push(`/dashboard/vendors/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Add Store Details
            </Button>
          </div>
        )}
      </TabsContent>
    );
  }

  function AffiliatesTab({ vendorId, tenantId }: AffiliatesTabProps) {
    const router = useRouter();
    const { fetchAffiliateRequests } = useAffiliateStore();
    const [requests, setRequests] = useState<AffiliateRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<{ message: string; status?: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const [activeTab, setActiveTab] = useState("all");
    const [pagination, setPagination] = useState({
      skip: 0,
      limit: 10,
      total: 0,
    });

    // Debounce search query
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
      }, 500);

      return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch affiliate requests
    const fetchRequests = useCallback(async () => {
      const headers: Record<string, string> = {};
      if (tenantId) headers["X-Tenant-ID"] = tenantId;

      const filters = {
        vendor_id: vendorId,
        skip: pagination.skip,
        limit: pagination.limit,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(activeTab !== "all" && { status: activeTab }),
      };

      try {
        setLoading(true);
        const { requests: data, total } = await fetchAffiliateRequests(filters, headers);
        setRequests(data);
        setPagination(prev => ({ ...prev, total }));
        setError(null);
      } catch (err: any) {
        setError({
          message: err.message || 'Failed to fetch affiliates',
          status: err.status,
        });
      } finally {
        setLoading(false);
      }
    }, [vendorId, tenantId, pagination.skip, pagination.limit, debouncedSearchQuery, activeTab]);

    useEffect(() => {
      fetchRequests();
    }, [fetchRequests]);

    return (
      <TabsContent value="affiliate" className="space-y-4 mt-4">
        <div className="flex justify-between mb-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search affiliates..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
              title="Failed to Load Affiliates"
              error={{
                status: error.status?.toString() || "Error",
                message: error.message || "An unexpected error occurred while loading affiliates."
              }}
              buttonText="Retry"
              buttonAction={fetchRequests}
              buttonIcon={RefreshCw}
            />
          ) : (
            <AffiliateRequestsTable requests={requests} />
          )}
        </Tabs>
      </TabsContent>
    );
  }

  function Sidebar() {
    return (
      <div className="md:col-span-2 space-y-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={vendorLogo} alt={vendor?.business_name} />
                <AvatarFallback className="text-xl">
                  {vendor?.business_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{vendor?.display_name}</h3>
              <p className="text-sm text-muted-foreground">
                {firstStore?.store_name ||
                  vendor?.store?.store_name ||
                  vendor?.business_name}
              </p>

              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge
                  variant={getStatusVariant(vendorStatus)}
                  className={`${getBadgeStyles(vendorStatus)} capitalize`}
                >
                  {vendorStatus}
                </Badge>

                {typeof vendor?.rating === "number" && vendor?.rating > 0 && (
                  <Badge variant="outline" className="flex items-center">
                    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                    {vendor.rating.toFixed(1)}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-2">
            <div className="w-full flex justify-between text-sm">
              <span className="text-muted-foreground">Registered:</span>
              <span className="font-medium">
                {formatDate(vendor?.created_at)}
              </span>
            </div>
            {vendor?.approved_at && (
              <div className="w-full flex justify-between text-sm">
                <span className="text-muted-foreground">Approved:</span>
                <span className="font-medium">
                  {formatDate(vendor.approved_at)}
                </span>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Verification Documents */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Verification Documents</h2>
          <div className="rounded-lg p-4 border shadow-sm">
            <VerificationDocumentManager
              documents={vendor?.verification_documents || []}
              onDocumentVerification={handleDocumentVerification}
              showActions={true}
              isProcessing={isUpdating}
            />
          </div>
        </div>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Approve */}
            {vendorStatus !== "approved" &&
              vendor.verification_documents?.length > 0 &&
              vendor.verification_documents.every(
                (doc: any) => doc.verification_status === "verified"
              ) && (
                <Can permission="vendors:update">
                  <Button
                    variant="outline"
                    className="w-full text-green-600"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange("approved")}
                  >
                    {isUpdating ? (
                      <Spinner className="h-4 w-4 mr-2" color="green" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approve Vendor
                  </Button>
                </Can>
              )}

            {/* Reject */}
            {vendorStatus !== "rejected" && (
              <Can permission="vendors:update">
                <Button
                  variant="outline"
                  className="w-full text-red-600"
                  disabled={isUpdating}
                  onClick={() => setShowRejectDialog(true)}
                >
                  {isUpdating ? (
                    <Spinner className="h-4 w-4 mr-2" color="red" />
                  ) : (
                    <Ban className="h-4 w-4 mr-2" />
                  )}
                  Reject Vendor
                </Button>
              </Can>
            )}

            {/* Activate/Deactivate Buttons */}
            {vendorStatus === "approved" && vendor.is_active && (
              <Can permission="vendors:update">
                <Button
                  variant="outline"
                  className="w-full text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange("inactive")}
                >
                  {isUpdating ? (
                    <Spinner className="h-4 w-4 mr-2" color="orange" />
                  ) : (
                    <Power className="h-4 w-4 mr-2" />
                  )}
                  Deactivate Vendor
                </Button>
              </Can>
            )}
            {vendorStatus === "approved" && !vendor.is_active && (
              <Can permission="vendors:update">
                <Button
                  variant="outline"
                  className="w-full text-green-600 hover:bg-green-50 hover:text-green-700"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange("active")}
                >
                  {isUpdating ? (
                    <Spinner className="h-4 w-4 mr-2" color="green" />
                  ) : (
                    <Power className="h-4 w-4 mr-2" />
                  )}
                  Activate Vendor
                </Button>
              </Can>
            )}

            <Separator />
            <Can permission="vendors:update">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/dashboard/vendors/${id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Vendor
              </Button>
            </Can>
            <Can permission="vendors:delete">
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Vendor
              </Button>
            </Can>

            {/* Inline delete confirmation */}
            {confirmDelete && (
              <div className="mt-4 p-3 border border-red-200 rounded-md bg-red-50">
                <p className="text-sm text-red-800 mb-2">
                  Are you sure you want to delete this vendor? This action
                  cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteVendor}
                    disabled={isDeleting}
                  >
                    {isDeleting && (
                      <Spinner className="mr-2 h-3 w-3" color="white" />
                    )}
                    Confirm Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default withAuthorization(VendorPage, { permission: "vendors:read" });
