"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Users, TrendingUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import Pagination from "@/components/ui/pagination";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAffiliateStore } from "@/features/affiliates/store";
import { Affiliate, AffiliateFilter, AffiliateAnalytics, TopAffiliate } from "@/features/affiliates/types";
import { AffiliateTable } from "@/features/affiliates/components/affiliate-table";
import { AffiliateRejectionDialog } from "@/features/affiliates/components";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

// Top Affiliates Table (mirrors AffiliateTable style)
interface TopAffiliatesTableProps {
  affiliates: TopAffiliate[];
}
function TopAffiliatesTable({ affiliates }: TopAffiliatesTableProps) {
  const router = useRouter();
  const getInitials = (name?: string) => {
    if (!name) return "N/A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  return (
    <div className="space-y-4 flex-grow flex flex-col">
      <div className="rounded-md border overflow-auto flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Total Commission</TableHead>
              <TableHead className="text-center">Order Count</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">No top affiliates found.</TableCell>
              </TableRow>
            ) : (
              affiliates.map((a: TopAffiliate) => (
                <TableRow key={a.affiliate_id} onClick={() => router.push(`/dashboard/affiliates/${a.affiliate_id}`)} className="hover:cursor-pointer hover:bg-muted/50" >
                  <TableCell>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={undefined} alt={a.name} />
                      <AvatarFallback>{getInitials(a.name)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-sm">{a.total_commission}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Badge variant="secondary">{a.order_count}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/affiliates/${a.affiliate_id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AffiliatesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const tenantId = session?.user?.tenant_id;

  const {
    affiliates,
    totalAffiliates,
    loading,
    error: storeError,
    fetchAffiliates,
    updateAffiliateStatus,
    analytics,
    analyticsLoading,
    analyticsError,
    fetchAffiliateAnalytics,
  } = useAffiliateStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const pageSize = 10;
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [pendingAction, setPendingAction] = useState<null | 'approve' | 'reject' | 'activate' | 'deactivate'>(null);

  const getFilters = () => {
    const baseFilter: any = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };
    if (searchQuery) {
      baseFilter.search = searchQuery;
    }
    let filters = baseFilter;
    switch (activeTab) {
      case "pending":
        filters = { ...baseFilter, status: "pending" };
        break;
      case "approved":
        filters = { ...baseFilter, status: "approved", is_active: true };
        break;
      case "rejected":
        filters = { ...baseFilter, status: "rejected" };
        break;
      default:
        filters = baseFilter;
    }
    return filters;
  };

  useEffect(() => {
    if (tenantId) {
      fetchAffiliates(getFilters(), { 'X-Tenant-ID': tenantId });
    }
  }, [currentPage, pageSize, searchQuery, activeTab, tenantId, fetchAffiliates]);

  useEffect(() => {
    if (tenantId) {
      fetchAffiliateAnalytics({ 'X-Tenant-ID': tenantId });
    }
  }, [tenantId, fetchAffiliateAnalytics]);

  const handleAffiliateClick = (affiliate: Affiliate) => {
    router.push(`/dashboard/affiliates/${affiliate.id}`);
  };

  const handleStatusChange = async (
    affiliateId: string,
    action: 'approve' | 'reject' | 'activate' | 'deactivate',
    rejectionReason?: string
  ): Promise<void> => {
    if (!tenantId) {
      console.error("Tenant ID is missing, cannot update status.");
      toast.error("Tenant ID is missing, cannot update status.");
      return;
    }
    setRejectLoading(action === 'reject');
    try {
      let statusData: any = {};
      switch (action) {
        case 'approve':
          statusData = { status: 'approved' };
          break;
        case 'reject':
          statusData = { status: 'rejected', rejection_reason: rejectionReason };
          break;
        case 'activate':
          statusData = { is_active: true };
          break;
        case 'deactivate':
          statusData = { is_active: false, status: 'inactive' };
          break;
      }
      const result = await updateAffiliateStatus(affiliateId, statusData, { 'X-Tenant-ID': tenantId });
      if (result && !(result as any).error) {
        await fetchAffiliates(getFilters(), { 'X-Tenant-ID': tenantId });
        toast.success(`Affiliate status updated successfully`);
      } else {
        toast.error(`Failed to ${action} affiliate`);
      }
    } catch (error) {
      console.error("Failed to update affiliate status:", error);
      toast.error(`Failed to ${action} affiliate`);
    } finally {
      setRejectLoading(false);
      setShowRejectDialog(false);
      setSelectedAffiliate(null);
      setPendingAction(null);
    }
  };

  const handleReject = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setShowRejectDialog(true);
    setPendingAction('reject');
  };

  const handleRejectConfirm = (reason: string, customReason?: string) => {
    if (!selectedAffiliate) return;
    if (!reason && !customReason) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    handleStatusChange(selectedAffiliate.id, 'reject', reason === 'other' ? customReason : reason);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  // Local search filtering, similar to VendorsPage
  // The API might also support search, in which case this local filter might be redundant
  // or a fallback. For now, let's assume API search is primary via getFilters().
  // If local search is preferred AFTER API fetch, implement similar to VendorsPage:
  // const locallyFilteredAffiliates = affiliates.filter((affiliate) => {
  //   if (!searchQuery.trim()) return true;
  //   const query = searchQuery.toLowerCase();
  //   return (
  //     affiliate.name?.toLowerCase().includes(query) ||
  //     affiliate.email?.toLowerCase().includes(query) ||
  //     affiliate.phone?.toLowerCase().includes(query)
  //   );
  // }) || [];

  // --- Stat Cards using BillingStatsCards style ---
  const renderStatCards = () => {
    if (analyticsLoading) {
      return <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4"><Spinner /></div>;
    }
    if (analyticsError) {
      return (
        <div className="p-4">
          <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive-foreground">{analyticsError.message}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    if (!analytics) return null;
    return (
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-card/60 bg-gradient-to-t from-primary/5 to-card shadow-xs">
          <CardHeader>
            <CardDescription>Total Clicks</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{analytics.total_clicks}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex items-center gap-2 font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Conversion Rate: <span className="font-semibold">{analytics.conversion_rate}%</span></span>
            </div>
          </CardFooter>
        </Card>
        <Card className="dark:bg-card/60 bg-gradient-to-t from-primary/5 to-card shadow-xs">
          <CardHeader>
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{analytics.total_orders}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex items-center gap-2 font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span>Total Commission: <span className="font-semibold">{analytics.total_commission}</span></span>
            </div>
          </CardFooter>
        </Card>
        <Card className="dark:bg-card/60 bg-gradient-to-t from-primary/5 to-card shadow-xs">
          <CardHeader>
            <CardDescription>Affiliates</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{analytics.affiliates.total}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex items-center gap-2 font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>All Affiliates</span>
            </div>
          </CardFooter>
        </Card>
        <Card className="dark:bg-card/60 bg-gradient-to-t from-primary/5 to-card shadow-xs">
          <CardHeader>
            <CardDescription>Top Affiliate</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {analytics.top_affiliates?.[0]?.name || "-"}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex items-center gap-2 font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Orders: <span className="font-semibold">{analytics.top_affiliates?.[0]?.order_count ?? '-'}</span></span>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // --- Top Affiliates Table ---
  const renderTopAffiliates = () => {
    if (!analytics || !analytics.top_affiliates?.length) return null;
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Top Affiliates</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-right">Total Commission</th>
                <th className="px-4 py-2 text-right">Order Count</th>
              </tr>
            </thead>
            <tbody>
              {analytics.top_affiliates.map((a) => (
                <tr key={a.affiliate_id} className="hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">{a.name}</td>
                  <td className="px-4 py-2">{a.email}</td>
                  <td className="px-4 py-2 text-right">{a.total_commission}</td>
                  <td className="px-4 py-2 text-right">{a.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading && affiliates.length === 0 && !isTabLoading) { // Initial page load
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Affiliates (Mawinga)</h1>
            <p className="text-muted-foreground">Manage marketplace affiliates</p>
          </div>
          <Button onClick={() => router.push("/dashboard/affiliates/add")}>
            <Plus className="mr-2 h-4 w-4" /> Add Affiliate
          </Button>
        </div>
        <div className="flex items-center justify-center flex-grow">
          <Spinner />
        </div>
      </div>
    );
  }

  if (storeError && !loading && affiliates.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Affiliates (Mawinga)</h1>
            <p className="text-muted-foreground">Manage marketplace affiliates</p>
          </div>
          <Button onClick={() => router.push("/dashboard/affiliates/add")}>
            <Plus className="mr-2 h-4 w-4" /> Add Affiliate
          </Button>
        </div>
        <div className="flex-grow">
          <ErrorCard
            title="Failed to load affiliates"
            error={{
              status: storeError.status?.toString() || "Error",
              message: storeError.message || "An unexpected error occurred."
            }}
            buttonText="Retry"
            buttonAction={() => {
              if (tenantId) {
                const baseFilter: any = {
                  skip: (currentPage - 1) * pageSize,
                  limit: pageSize,
                };
                if (searchQuery) {
                  baseFilter.search = searchQuery;
                }
                let filters = baseFilter;
                switch (activeTab) {
                  case "pending":
                    filters = { ...baseFilter, status: "pending" };
                    break;
                  case "approved":
                    filters = { ...baseFilter, status: "approved", is_active: true };
                    break;
                  case "rejected":
                    filters = { ...baseFilter, status: "rejected" };
                    break;
                  default:
                    filters = baseFilter;
                }
                fetchAffiliates(filters, { 'X-Tenant-ID': tenantId });
              }
            }}
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
          <h1 className="text-2xl font-bold tracking-tight">Affiliates (Mawinga)</h1>
          <p className="text-muted-foreground">Manage marketplace affiliates</p>
        </div>
        <Can permission="affiliate:create">
          <Button onClick={() => router.push("/dashboard/affiliates/add")}>
            <Plus className="mr-2 h-4 w-4" /> Add Affiliate
          </Button>
        </Can>
      </div>
      {renderStatCards()}

      <div className="p-4 space-y-4 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search affiliates..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all">
              All Affiliates
              {analytics && (
                <Badge variant="secondary" className="ml-2 align-middle">{analytics.affiliates.total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {analytics && (
                <Badge variant="secondary" className="ml-2 align-middle">{analytics.affiliates.pending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved
              {analytics && (
                <Badge variant="secondary" className="ml-2 align-middle">{analytics.affiliates.approved}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected
              {analytics && (
                <Badge variant="secondary" className="ml-2 align-middle">{analytics.affiliates.rejected}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="top">Top Affiliates</TabsTrigger>
          </TabsList>
          {/* Normal affiliate tabs */}
          {activeTab !== 'top' ? (
            isTabLoading || (loading && affiliates.length === 0) ? (
              <Spinner />
            ) : storeError && affiliates.length === 0 ? (
              <ErrorCard
                title="Failed to load affiliates for this tab"
                error={{
                  status: storeError.status?.toString() || "Error",
                  message: storeError.message || "An unexpected error occurred."
                }}
                buttonText="Retry"
                buttonAction={() => {
                  if (tenantId) {
                    const baseFilter: any = {
                      skip: (currentPage - 1) * pageSize,
                      limit: pageSize,
                    };
                    if (searchQuery) {
                      baseFilter.search = searchQuery;
                    }
                    let filters = baseFilter;
                    switch (activeTab) {
                      case "pending":
                        filters = { ...baseFilter, status: "pending" };
                        break;
                      case "approved":
                        filters = { ...baseFilter, status: "approved" };
                        break;
                      case "rejected":
                        filters = { ...baseFilter, status: "rejected" };
                        break;
                      default:
                        filters = baseFilter;
                    }
                    fetchAffiliates(filters, { 'X-Tenant-ID': tenantId });
                  }
                }}
                buttonIcon={RefreshCw}
              />
            ) : (
              <div className="flex-grow flex flex-col">
                <AffiliateTable
                  affiliates={affiliates} // Pass the affiliates from the store
                  onAffiliateClick={handleAffiliateClick}
                  onStatusChange={async (id, action, rejectionReason) => {
                    const affiliate = affiliates.find(a => a.id === id);
                    if (action === 'reject' && affiliate) {
                      handleReject(affiliate);
                    } else {
                      await handleStatusChange(id, action, rejectionReason);
                    }
                  }}
                  activeTab={activeTab} // Pass activeTab if table needs it for conditional rendering of actions
                />
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={totalAffiliates}
                  onPageChange={(page) => setCurrentPage(page)}
                />
                <AffiliateRejectionDialog
                  isOpen={showRejectDialog}
                  onClose={() => setShowRejectDialog(false)}
                  onConfirm={handleRejectConfirm}
                  loading={rejectLoading}
                  title="Reject Affiliate"
                  description="Please provide a reason for rejecting this affiliate. This information may be shared with the affiliate."
                  actionText="Reject"
                />
              </div>
            )
          ) : (
            // Top Affiliates Tab
            <div className="flex-grow flex flex-col">
              <TopAffiliatesTable affiliates={analytics?.top_affiliates || []} />
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default withAuthorization(AffiliatesPage, { permission: "affiliate:read" });
