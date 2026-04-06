"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { use } from "react";
import { format } from "date-fns";
import {
  ArrowLeft, Banknote, CalendarDays, FileText, Tag, ClipboardCheck,
  CreditCard, Check, X, Percent, Clock, Calendar, ShoppingBag,
  User, Building, Phone, Mail, ExternalLink, BarChart, History,
  CreditCard as CreditCardIcon, CheckCircle, AlertCircle, ChevronRight,
  Receipt, Calculator, Eye, Wallet, Settings, Store, Globe, Info, ListChecks
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { useLoanRequestStore } from "@/features/loans/requests/store";
import { LoanRequest, PaymentSchedule, DetailedLoan } from "@/features/loans/requests/types";
import { useLoanProductStore } from "@/features/loans/products/store";
import { useLoanProviderStore } from "@/features/loans/providers/store";
import { useVendorStore } from "@/features/vendors/store";
import { compactCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { ApiResponse } from "@/lib/core/api";

import { withAuthorization } from "@/components/auth/with-authorization";
import { withModuleAuthorization } from "@/components/auth/with-module-authorization";


const StatusTimeline = ({ request, loan }: { request: LoanRequest; loan?: DetailedLoan | null }) => {
  if (!request) return null;

  const requestStatus = request.status?.toUpperCase();

  // If denied, show a denied banner instead of the timeline
  if (requestStatus === 'REJECTED' || requestStatus === 'DENIED') {
    return (
      <div className="w-full py-6 px-4">
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200">
          <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-red-700">Request Denied</p>
            <p className="text-xs text-red-500 mt-1">
              {request.updated_at
                ? format(new Date(request.updated_at), 'MMM d, yyyy')
                : 'Date unavailable'}
            </p>
            {request.rejection_reason && (
              <p className="text-xs text-red-600 mt-2 max-w-xs">
                Reason: {request.rejection_reason}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Determine step completion from actual API data
  const isApproved = requestStatus === 'APPROVED';
  const isDisbursed = loan?.disbursement_status?.toUpperCase() === 'DISBURSED';
  const isRepaid = loan?.status?.toUpperCase() === 'REPAID';

  const steps = [
    {
      id: 'requested',
      label: 'Requested',
      completed: true, // Always true — request exists
      date: request.created_at,
      icon: FileText,
    },
    {
      id: 'approved',
      label: 'Approved',
      completed: isApproved,
      date: isApproved ? (loan?.created_at ?? null) : null,
      icon: CheckCircle,
    },
    {
      id: 'disbursed',
      label: 'Disbursed',
      completed: isDisbursed,
      date: isDisbursed ? (loan?.disbursed_at ?? null) : null,
      icon: Wallet,
    },
    {
      id: 'repaid',
      label: 'Repaid',
      completed: isRepaid,
      date: isRepaid ? (loan?.updated_at ?? null) : null,
      icon: Banknote,
    },
  ];

  // Mark the last completed step as "active" (current stage)
  let activeIndex = 0;
  steps.forEach((step, i) => {
    if (step.completed) activeIndex = i;
  });

  // Calculate progress width based on last completed step position
  const progressWidth = (activeIndex / (steps.length - 1)) * 100;

  return (
    <div className="w-full py-4 px-2">
      <div className="relative flex justify-between">
        {/* Connecting Line */}
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -z-0">
          <div
            className="h-full bg-primary transition-all duration-700 ease-in-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {steps.map((step, index) => {
          const isCompleted = step.completed;
          const isActive = index === activeIndex;
          const isPending = !isCompleted;

          let colorClass = "bg-gray-100 text-gray-400 border-gray-200";
          if (isCompleted && !isActive) colorClass = "bg-primary text-white border-primary";
          if (isActive) colorClass = "bg-primary text-white border-primary ring-4 ring-primary/20 shadow-lg shadow-primary/25";
          if (isPending && !isCompleted) colorClass = "bg-gray-50 text-gray-300 border-gray-200";

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${colorClass}`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center">
                <p className={`text-sm font-medium transition-colors duration-300 ${isActive ? 'text-primary font-semibold' :
                    isCompleted ? 'text-muted-foreground' :
                      'text-muted-foreground/50'
                  }`}>
                  {step.label}
                </p>
                {step.date ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(step.date), 'MMM d')}
                  </p>
                ) : (
                  isPending && (
                    <p className="text-xs text-muted-foreground/40 mt-0.5">—</p>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const formatDate = (date: string | Date | undefined, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'short' : 'long',
    day: 'numeric',
  };

  if (format === 'long') {
    options.hour = 'numeric';
    options.minute = 'numeric';
    options.hour12 = true;
  }

  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
};

interface LoanRequestDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function LoanRequestDetailPage({ params }: LoanRequestDetailPageProps) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();
  const session = useSession();
  const tenantId = (session?.data?.user as any)?.tenant_id || '';

  const {
    request,
    loading: requestLoading,
    storeError: requestError,
    fetchRequest,
    updateRequestStatus,
    addPenalty,
    detailedLoan,
    detailedLoanLoading,
    fetchDetailedLoan
  } = useLoanRequestStore();

  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyLoading, setPenaltyLoading] = useState(false);

  const handleAddPenalty = async () => {
    if (!penaltyAmount || !penaltyReason) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setPenaltyLoading(true);
      await addPenalty(id, {
        amount: parseFloat(penaltyAmount),
        reason: penaltyReason
      });
      toast.success("Penalty added successfully");
      setPenaltyOpen(false);
      setPenaltyAmount("");
      setPenaltyReason("");
    } catch (error) {
      // Error handled by store
      toast.error("Failed to add penalty");
    } finally {
      setPenaltyLoading(false);
    }
  };

  const {
    product,
    loading: productLoading,
    fetchProduct
  } = useLoanProductStore();

  const {
    provider,
    loading: providerLoading,
    fetchProvider
  } = useLoanProviderStore();

  const {
    vendor,
    loading: vendorLoading,
    fetchVendor
  } = useVendorStore();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [vendorLoanHistory, setVendorLoanHistory] = useState<LoanRequest[]>([]);
  const [vendorHistoryLoading, setVendorHistoryLoading] = useState(false);

  // Memoize tenant headers to prevent recreation on each render
  const tenantHeaders = useMemo(() => ({
    'X-Tenant-ID': tenantId
  }), [tenantId]);

  // Use a stable function reference with useCallback
  const fetchLoanRequestData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      await fetchRequest(id, tenantHeaders);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [fetchRequest, id, tenantHeaders]);

  // Call the fetch function only once on mount
  useEffect(() => {
    fetchLoanRequestData();
  }, [fetchLoanRequestData]);

  // Extract stable references to IDs to use in dependency arrays
  const requestId = request?.request_id || request?.id;
  const productId = request?.product_id;
  const vendorId = request?.vendor_id;

  // Separate effect for product fetching with minimal dependencies
  useEffect(() => {
    if (productId) {
      fetchProduct(productId, tenantHeaders).catch(() => { });
    }
  }, [productId, fetchProduct, tenantHeaders]);

  // Separate effect for vendor fetching with minimal dependencies
  useEffect(() => {
    if (vendorId) {
      fetchVendor(vendorId, tenantHeaders).catch(() => { });
    }
  }, [vendorId, fetchVendor, tenantHeaders]);

  // Fetch detailed loan data once request is loaded (any non-pending status)
  useEffect(() => {
    if (request && requestId) {
      const status = request.status?.toLowerCase();
      // Skip only for pending/rejected — all others may have loan data
      if (status !== 'pending' && status !== 'rejected') {
        fetchDetailedLoan(id, tenantHeaders).catch((err) => {
          console.warn('No detailed loan data available:', err);
        });
      }
    }
  }, [requestId, request?.status, fetchDetailedLoan, id, tenantHeaders]);

  // Separate effect for provider fetching
  useEffect(() => {
    const fetchProviderData = async () => {
      if (product?.provider_id) {
        try {
          await fetchProvider(product.provider_id, tenantHeaders);
        } catch (error) {
        }
      }
    };

    fetchProviderData();
  }, [product?.provider_id, fetchProvider, tenantHeaders]);

  // Fetch real vendor loan history
  useEffect(() => {
    const fetchVendorHistory = async () => {
      if (!vendorId) return;
      try {
        setVendorHistoryLoading(true);
        const response = await apiClient.get<LoanRequest[]>(`/loans/vendors/${vendorId}/requests`, undefined, tenantHeaders);
        const rawData = response.data as unknown as (ApiResponse<LoanRequest[]> | LoanRequest[]);
        const historyList = Array.isArray(rawData) ? rawData : ((rawData as any).data || []);
        setVendorLoanHistory(historyList);
      } catch (error) {
        console.warn('Failed to fetch vendor loan history:', error);
      } finally {
        setVendorHistoryLoading(false);
      }
    };

    fetchVendorHistory();
  }, [vendorId, tenantHeaders]);

  // Calculate monthly payment for a loan
  const calculateMonthlyPayment = (principal: string | number | undefined | null, interestRate: string | number | undefined | null, termMonths: number | undefined | null) => {
    if (!principal || !interestRate || !termMonths) return 0;

    try {
      const p = typeof principal === 'number' ? principal : parseFloat(principal.toString());
      const r = (typeof interestRate === 'number' ? interestRate : parseFloat(interestRate.toString())) / 100 / 12; // Monthly interest rate
      const n = termMonths;

      // Monthly payment formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
      if (r === 0) return p / n; // If interest rate is 0, just divide principal by term

      const monthlyPayment = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      return isNaN(monthlyPayment) ? 0 : monthlyPayment;
    } catch (e) {
      return 0;
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      setUpdating(true);
      await updateRequestStatus(id, status, tenantHeaders);
      await fetchRequest(id, tenantHeaders);

      toast.success(`Loan request status updated to ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case 'disbursed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Disbursed</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderStatusActions = () => {
    if (!request) return null;

    const status = request.status.toLowerCase();

    switch (status) {
      case 'pending':
        return (
          <div className="flex space-x-2 mt-4">
            <Button
              variant="default"
              disabled={updating}
              onClick={() => handleStatusChange('approved')}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              disabled={updating}
              onClick={() => handleStatusChange('rejected')}
            >
              Reject
            </Button>
          </div>
        );
      case 'approved':
        return (
          <div className="flex space-x-2 mt-4">
            <Button
              variant="default"
              disabled={updating}
              onClick={() => handleStatusChange('disbursed')}
            >
              Mark as Disbursed
            </Button>
          </div>
        );
      case 'disbursed':
        return (
          <div className="flex space-x-2 mt-4">
            <Button
              variant="default"
              disabled={updating}
              onClick={() => handleStatusChange('paid')}
            >
              Mark as Paid
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading || requestLoading) {
    return (
      <Spinner />
    );
  }

  if (!request && !requestLoading && requestError) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/loans/requests")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">Loan Request</h1>
              <p className="text-muted-foreground">
                Error loading request details
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 flex items-center justify-center">
          <div className="max-w-md w-full">
            <ErrorCard
              title="Failed to load loan request"
              error={{
                status: requestError.status?.toString() || "Error",
                message: requestError.message || "An error occurred while loading the loan request details."
              }}
              buttonText="Return to Loan Requests"
              buttonAction={() => router.push("/dashboard/loans/requests")}
              buttonIcon={ArrowLeft}
            />
          </div>
        </div>
      </div>
    );
  }

  // Format date helper for display
  const formatDateDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/vendor-loans/requests")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback style={{ backgroundColor: "#6366f1" }} className="text-white">
                <Banknote className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {compactCurrency(request?.loan_amount || 0)} Loan Request
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getStatusBadge(request?.status || 'Unknown')}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Requested: {formatDateDisplay(request?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {renderStatusActions()}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {/* Main Content Area - 5 columns */}
          <div className="md:col-span-5">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Info className="h-4 w-4" /> Overview
                </TabsTrigger>
                <TabsTrigger value="payment-plan" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Payment Plan
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Transactions
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" /> Loan History
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Documents
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Request Details Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Request Details</CardTitle>
                        <CardDescription>Basic information about this loan request</CardDescription>
                      </div>
                      {getStatusBadge(request?.status || 'Unknown')}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Banknote className="h-4 w-4" /> Loan Amount
                          </p>
                          <p className="text-xl font-bold">{compactCurrency(request?.loan_amount || 0)}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" /> Term Length
                          </p>
                          <p className="text-sm">
                            {request?.term_length} {request?.term_length === 1 ? 'month' : 'months'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Percent className="h-4 w-4" /> Interest Rate
                          </p>
                          <p className="text-sm">{product?.interest_rate || 'N/A'}%</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" /> Request Date
                          </p>
                          <p className="text-sm">{formatDateDisplay(request?.created_at)}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" /> Expected Disbursement
                          </p>
                          <p className="text-sm">
                            {request?.status === 'approved' ? formatDateDisplay(new Date().toISOString()) : 'Pending approval'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <CreditCard className="h-4 w-4" /> Monthly Payment (Est.)
                          </p>
                          <p className="text-sm">
                            {product && request ?
                              compactCurrency(calculateMonthlyPayment(request.loan_amount, product.interest_rate, request.term_length)) :
                              'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-4 w-4" /> Purpose
                        </p>
                        <div className="bg-muted/20 p-3 rounded-md border text-sm">
                          {request?.purpose || 'No purpose specified'}
                        </div>
                      </div>

                      {request?.notes && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-4 w-4" /> Additional Notes
                          </p>
                          <div className="bg-muted/20 p-3 rounded-md border text-sm">
                            {request.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {request?.status === 'pending' && (
                    <CardFooter className="flex justify-end gap-2 border-t p-4">
                      <Button
                        variant="outline"
                        disabled={updating}
                        onClick={() => handleStatusChange('rejected')}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject Request
                      </Button>
                      <Button
                        variant="default"
                        disabled={updating}
                        onClick={() => handleStatusChange('approved')}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve Request
                      </Button>
                    </CardFooter>
                  )}
                </Card>

                {/* Loan Summary Card */}
                <Card className="overflow-hidden border-2 border-primary/10">
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Info className="h-3 w-3 mr-1" />
                        Summary
                      </Badge>
                      <CardTitle className="text-lg">Loan Summary</CardTitle>
                    </div>
                    <CardDescription>Overview of loan terms and repayment</CardDescription>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Loan Summary Stats */}
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-white to-primary/5">
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                      <CreditCard className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium">Principal</p>
                                  </div>
                                  <Badge variant="outline" className="bg-primary/5">Requested</Badge>
                                </div>
                                <p className="text-3xl font-bold text-primary">{compactCurrency(request?.loan_amount || 0)}</p>
                                <p className="text-xs text-muted-foreground">Total loan amount requested</p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-white to-primary/5">
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                      <Wallet className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium">Outstanding Balance</p>
                                  </div>
                                </div>
                                <p className="text-3xl font-bold text-primary">
                                  {detailedLoan ? compactCurrency(detailedLoan.outstanding_balance) : (request?.loan_amount ? compactCurrency(request.loan_amount) : '0')}
                                </p>
                                <p className="text-xs text-muted-foreground">Remaining loan balance</p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-white to-primary/5">
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                      <Percent className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium">Interest Amount</p>
                                  </div>
                                </div>
                                <p className="text-3xl font-bold text-primary">
                                  {detailedLoan ?
                                    compactCurrency(detailedLoan.total_expected_interest) :
                                    (product && request ?
                                      compactCurrency((calculateMonthlyPayment(request.loan_amount, product.interest_rate, request.term_length) * request.term_length) - request.loan_amount) :
                                      'N/A')
                                  }
                                </p>
                                <p className="text-xs text-muted-foreground">Total interest on this loan</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Payment Schedule - Simplified */}
                      <div>
                        <Card className="border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-white to-primary/5">
                          <CardContent className="p-4">
                            <div className="flex flex-row justify-between items-center">
                              {/* Left Side - Payment */}
                              <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-full">
                                  <Calendar className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Monthly Payment</p>
                                  <p className="text-2xl font-bold text-primary">
                                    {product && request ?
                                      compactCurrency(calculateMonthlyPayment(request.loan_amount, product.interest_rate, request.term_length)) :
                                      'N/A'}
                                  </p>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="h-12 w-px bg-muted mx-4 hidden md:block"></div>

                              {/* Right Side - Term */}
                              <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-full">
                                  <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Term Length</p>
                                  <p className="text-2xl font-bold text-primary">
                                    {request?.term_length || 0} <span className="text-lg font-medium text-primary/70">{(request?.term_length || 0) === 1 ? 'month' : 'months'}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Status Timeline */}
                      {request && (
                        <div className="pt-4 border-t mt-4">
                          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Loan Status Timeline
                          </h3>
                          <StatusTimeline request={request} loan={detailedLoan} />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment Plan Tab */}
              <TabsContent value="payment-plan" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Schedule</CardTitle>
                    <CardDescription>Scheduled payments and their status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Interest</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailedLoanLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <Spinner className="h-6 w-6 mx-auto" />
                              <p className="mt-2 text-sm text-muted-foreground">Loading payment schedule...</p>
                            </TableCell>
                          </TableRow>
                        ) : detailedLoan?.schedules && detailedLoan.schedules.length > 0 ? (
                          detailedLoan.schedules.map((schedule) => (
                            <TableRow key={schedule.schedule_id}>
                              <TableCell>{schedule.installment_number}</TableCell>
                              <TableCell>{formatDateDisplay(schedule.due_date)}</TableCell>
                              <TableCell>{compactCurrency(schedule.amount_due)}</TableCell>
                              <TableCell>{compactCurrency(schedule.principal_due)}</TableCell>
                              <TableCell>{compactCurrency(schedule.interest_due)}</TableCell>
                              <TableCell>{compactCurrency(schedule.amount_due)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  schedule.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' :
                                    schedule.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                      schedule.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200' : ''
                                }>
                                  {schedule.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              No payment schedule available yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-6 mt-6">
                {/* Penalties Section */}
                <Card className="border-red-100">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-red-700 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" /> Penalties & Fees
                        </CardTitle>
                        <CardDescription>Active penalties and late fees</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => setPenaltyOpen(true)}
                      >
                        Add Penalty
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {request?.penalties && request.penalties.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {request.penalties.map((penalty) => (
                            <TableRow key={penalty.penalty_id}>
                              <TableCell>{formatDateDisplay(penalty.applied_at)}</TableCell>
                              <TableCell>{penalty.reason}</TableCell>
                              <TableCell>{compactCurrency(penalty.amount)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  penalty.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                }>
                                  {penalty.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg bg-red-50/20">
                        No active penalties
                        <p className="text-xs mt-1">Penalties will appear here when applied.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>All financial transactions related to this loan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailedLoanLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              <Spinner className="h-6 w-6 mx-auto" />
                              <p className="mt-2 text-sm text-muted-foreground">Loading transactions...</p>
                            </TableCell>
                          </TableRow>
                        ) : detailedLoan?.repayments && detailedLoan.repayments.length > 0 ? (
                          detailedLoan.repayments.map((repayment) => (
                            <TableRow key={repayment.repayment_id}>
                              <TableCell>{formatDateDisplay(repayment.payment_date)}</TableCell>
                              <TableCell className="capitalize">Repayment</TableCell>
                              <TableCell>{repayment.payment_method} {repayment.reference_number ? `(${repayment.reference_number})` : ''}</TableCell>
                              <TableCell className="text-green-600">
                                +{compactCurrency(repayment.amount_paid)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`capitalize ${repayment.status === 'SUCCESS' || repayment.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                                  repayment.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                  {repayment.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              No transactions recorded yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Loan History Tab */}
              <TabsContent value="history" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Loan History</CardTitle>
                    <CardDescription>Previous and current loans for this vendor</CardDescription>
                  </CardHeader>

                  <CardContent>
                    {vendorHistoryLoading ? (
                      <div className="flex justify-center py-8">
                        <Spinner className="h-6 w-6" />
                        <p className="ml-2 text-sm text-muted-foreground">Loading loan history...</p>
                      </div>
                    ) : vendorLoanHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Loan Amount</TableHead>
                              <TableHead>Term</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vendorLoanHistory.map((historyLoan) => {
                              const loanId = historyLoan.request_id || historyLoan.id;
                              const isCurrent = loanId === id;
                              return (
                                <TableRow key={loanId} className={isCurrent ? "bg-muted/20" : ""}>
                                  <TableCell>{formatDate(historyLoan.created_at, 'short')}</TableCell>
                                  <TableCell>{compactCurrency(historyLoan.loan_amount)}</TableCell>
                                  <TableCell>{historyLoan.term_length} {historyLoan.term_length === 1 ? 'month' : 'months'}</TableCell>
                                  <TableCell>
                                    {getStatusBadge(historyLoan.status)}
                                  </TableCell>
                                  <TableCell>
                                    {!isCurrent ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.push(`/dashboard/vendor-loans/requests/${loanId}`)}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View
                                      </Button>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">Current</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No loan history available for this vendor</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Loan Documents</CardTitle>
                    <CardDescription>Important documents related to this loan</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Application Document */}
                        <div className="border rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-md">
                              <FileText className="h-6 w-6 text-blue-700" />
                            </div>
                            <div>
                              <p className="font-medium">Loan Application</p>
                              <p className="text-sm text-muted-foreground">
                                Submitted on {formatDateDisplay(request?.created_at)}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>

                        {/* Agreement Document */}
                        {(request?.status === 'approved' || request?.status === 'disbursed' || request?.status === 'paid') && (
                          <div className="border rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 p-2 rounded-md">
                                <FileText className="h-6 w-6 text-green-700" />
                              </div>
                              <div>
                                <p className="font-medium">Loan Agreement</p>
                                <p className="text-sm text-muted-foreground">
                                  Generated on {formatDateDisplay(new Date().toISOString())}
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        )}

                        {/* Payment Schedule Document */}
                        {(request?.status === 'approved' || request?.status === 'disbursed' || request?.status === 'paid') && (
                          <div className="border rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-purple-100 p-2 rounded-md">
                                <CalendarDays className="h-6 w-6 text-purple-700" />
                              </div>
                              <div>
                                <p className="font-medium">Payment Schedule</p>
                                <p className="text-sm text-muted-foreground">
                                  {request?.term_length} monthly payments
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 2 columns */}
          <div className="md:col-span-2 space-y-6">
            {/* Vendor Information */}
            <Card>
              <CardHeader>
                <CardTitle>Vendor Information</CardTitle>
                <CardDescription>Borrower details</CardDescription>
              </CardHeader>

              <CardContent>
                {vendorLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : vendor ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: "#10b981" }}>
                          {vendor.business_name ? vendor.business_name.substring(0, 2).toUpperCase() : 'VE'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{vendor.business_name || vendor.display_name || request?.vendor_name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className={vendor.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
                            {vendor.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      {vendor.contact_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${vendor.contact_email}`} className="hover:underline">{vendor.contact_email}</a>
                        </div>
                      )}

                      {vendor.contact_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${vendor.contact_phone}`} className="hover:underline">{vendor.contact_phone}</a>
                        </div>
                      )}

                      {vendor.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-1"
                          >
                            {vendor.website.replace(/^https?:\/\//, '')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">{request?.vendor_name || 'Unknown Vendor'}</h3>
                      {request?.vendor_email && (
                        <p className="text-sm text-muted-foreground">{request.vendor_email}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/vendors/${request?.vendor_id || vendor?.id}`)}
                >
                  <Store className="h-4 w-4 mr-2" />
                  View Vendor Profile
                </Button>
              </CardFooter>
            </Card>

            {/* Loan Product */}
            {product && (
              <Card>
                <CardHeader>
                  <CardTitle>Loan Product</CardTitle>
                  <CardDescription>Product information</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ backgroundColor: "#6366f1" }} className="text-white">
                        <Banknote className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Badge variant={product.is_active ? "default" : "secondary"} className="capitalize">
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="text-sm font-medium">{product.interest_rate}%</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Amount Range</p>
                      <p className="text-sm font-medium">
                        {compactCurrency(product.min_amount)} - {compactCurrency(product.max_amount)}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/dashboard/vendor-loans/products/${product.product_id || product.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Product Details
                  </Button>
                </CardFooter>
              </Card>
            )}



            {/* Approval Actions */}
            {request?.status === 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle>Approval Actions</CardTitle>
                  <CardDescription>Process this loan request</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="default"
                      disabled={updating}
                      onClick={() => handleStatusChange('approved')}
                      className="w-full"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve Request
                    </Button>

                    <Button
                      variant="outline"
                      disabled={updating}
                      onClick={() => handleStatusChange('rejected')}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {(request?.status === 'approved' || request?.status === 'disbursed') && (
              <Card>
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                  <CardDescription>Loan processing actions</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {request?.status === 'approved' && (
                    <Button
                      variant="default"
                      disabled={updating}
                      onClick={() => handleStatusChange('disbursed')}
                      className="w-full"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Mark as Disbursed
                    </Button>
                  )}

                  {request?.status === 'disbursed' && (
                    <Button
                      variant="default"
                      disabled={updating}
                      onClick={() => handleStatusChange('paid')}
                      className="w-full"
                    >
                      <Banknote className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={penaltyOpen} onOpenChange={setPenaltyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Penalty / Fee</DialogTitle>
            <DialogDescription>
              Apply a penalty or fee to this loan request. This will increase the total payable amount.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g. Late payment fee"
                value={penaltyReason}
                onChange={(e) => setPenaltyReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPenaltyOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddPenalty}
              disabled={penaltyLoading || !penaltyAmount || !penaltyReason}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {penaltyLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Add Penalty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withModuleAuthorization(withAuthorization(LoanRequestDetailPage as any, {
  permission: "vendor-loans:read",
}), "vendor_loans");
