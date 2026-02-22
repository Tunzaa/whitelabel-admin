"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User as NextAuthUser, DefaultSession } from "next-auth";
import { format } from "date-fns";
import {
  EllipsisVertical,
  Check,
  AlertCircle,
  Code2,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useOrderStore } from "@/features/orders/store";
import { useTransactionStore } from "@/features/orders/transactions/store";
import { useVendorStore } from "@/features/vendors/store";
import { useModules } from "@/features/auth/hooks/use-modules";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ErrorCard } from "@/components/ui/error-card";
import { Spinner } from "@/components/ui/spinner";
import { Copy } from "@/components/ui/copy";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import DeliveryManagement from "@/features/orders/components/order-delivery-management";
import { TransactionStatus } from "@/features/orders/transactions/types";
import { VendorResponseItem } from "@/features/orders/components/vendor-response-item";
import { RefundModal } from "@/features/orders/components/refund-modal";
import {
  Order,
  OrderItem,
  VendorResponse,
  OrderError,
  SupportTicket,
} from "@/features/orders/types";

import { Can } from "@/components/auth/can";
import {
  ArrowLeft,
  Package,
  CreditCard,
  Truck,
  User,
  RefreshCcw,
  ShoppingBag,
  ExternalLink,
  Mail,
  Phone,
  FileText,
  Calendar,
  MessageCircle,
  AlertCircle as TicketIcon,
} from "lucide-react";

interface ExtendedUser extends NextAuthUser {
  tenant_id?: string;
}

const OrderPage = () => {
  const params = useParams();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "payment">(
    "overview",
  );
  const handleTabChange = (value: "overview" | "payment") =>
    setActiveTab(value);
  const [loadedVendors, setLoadedVendors] = useState<Record<string, boolean>>(
    {},
  );
  const [vendorData, setVendorData] = useState<
    Record<string, { vendor: any; loading: boolean }>
  >({});
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [loadingTransactionId, setLoadingTransactionId] = useState<
    string | null
  >(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [showCompleteRefundConfirm, setShowCompleteRefundConfirm] =
    useState(false);
  const [isCompletingRefund, setIsCompletingRefund] = useState(false);

  const { data: session } = useSession();
  const router = useRouter();

  const {
    order,
    fetchOrder,
    updateOrderStatus,
    createRefund,
    clearStore,
    loading: orderLoading,
    error: orderError,
  } = useOrderStore();
  const {
    transactions,
    fetchTransactionsByOrder,
    fetchTransaction,
    loading,
    error: transactionsError,
  } = useTransactionStore();
  const { fetchVendor } = useVendorStore();
  const { isModuleEnabled } = useModules();

  const getTransactionStatusBadgeVariant = (status?: string) => {
    if (!status) return "secondary";

    const statusLower = status.toLowerCase();

    if (["completed", "succeeded", "paid", "success"].includes(statusLower)) {
      return "success";
    } else if (["pending", "processing"].includes(statusLower)) {
      return "warning";
    } else if (
      ["failed", "canceled", "cancelled", "declined"].includes(statusLower)
    ) {
      return "destructive";
    } else if (["refunded", "partially_refunded"].includes(statusLower)) {
      return "outline";
    }

    return "secondary";
  };

  const getStatusBadgeVariant = (status?: string) => {
    if (!status) return "secondary";
    return getTransactionStatusBadgeVariant(status);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not specified";
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  const formatPrice = (
    price: number | string | undefined,
    currency: any = "TZS",
    options?: { currency?: string | object },
  ): string => {
    if (price === undefined || price === null || price === "") return "N/A";
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) return "N/A";

    // Safely extract currency code
    const getCurrencyCode = (curr: any): string => {
      if (!curr) return "TZS";
      if (typeof curr === "string") return curr.toUpperCase();
      if (typeof curr === "object" && curr !== null) {
        // Handle case where currency is an object with a 'code' property
        if ("code" in curr && typeof curr.code === "string") {
          return curr.code.toUpperCase();
        }
        // Handle case where currency is an object with a 'currency' property
        if ("currency" in curr && typeof curr.currency === "string") {
          return curr.currency.toUpperCase();
        }
      }
      return "TZS"; // Default fallback
    };

    const displayCurrency = getCurrencyCode(options?.currency || currency);

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: displayCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numPrice);
    } catch (e) {
      // Fallback to simple formatting if currency is invalid
      return `${displayCurrency} ${numPrice.toFixed(2)}`;
    }
  };

  const formatTransactionDate = (dateString?: string | null): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  // Reset state when component unmounts or orderId changes
  useEffect(() => {
    return () => {
      // Clear the order store when component unmounts or orderId changes
      clearStore();
      setCurrentTransaction(null);
    };
  }, [orderId, clearStore, setCurrentTransaction]);

  // Fetch order data when component mounts or ID changes
  useEffect(() => {
    if (!orderId || !session?.user) return;

    // Reset states when orderId changes
    clearStore();
    setCurrentTransaction(null);

    const headers: Record<string, string> = {};

    // Type assertion for user with tenant_id
    const user = session.user as any;
    if (user?.tenant_id) {
      headers["X-Tenant-ID"] = user.tenant_id;
    }

    if (user?.accessToken) {
      headers["Authorization"] = `Bearer ${user.accessToken}`;
    }

    fetchOrder(orderId, headers);
  }, [orderId, session?.user, fetchOrder]);

  // Fetch transactions when the order loads
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (order?.order_number) {
      fetchTransactionsByOrder(order.order_number, {
        "X-Tenant-ID": (session?.user as ExtendedUser)?.tenant_id || "",
      }).then((fetchedTransactions) => {
        if (fetchedTransactions.length > 0) {
          // Auto-expand the first transaction
          const firstTransaction = fetchedTransactions[0];
          setExpandedTransaction(firstTransaction.transaction_id);
          setCurrentTransaction(firstTransaction);
        }
      });
    }
  }, [order?.order_number, fetchTransactionsByOrder, session?.user]);

  // Fetch transaction details when a transaction is selected in the accordion
  useEffect(() => {
    const fetchTransactionData = async () => {
      if (expandedTransaction) {
        setLoadingTransactionId(expandedTransaction);
        try {
          const transaction = await fetchTransaction(expandedTransaction, {
            "X-Tenant-ID": (session?.user as ExtendedUser)?.tenant_id || "",
          });
          setCurrentTransaction(transaction);
          setLoadingTransactionId(null);
        } catch (error) {
          toast.error("Failed to load transaction details");
          setLoadingTransactionId(null);
        }
      }
    };

    fetchTransactionData();
  }, [expandedTransaction, fetchTransaction, session?.user]);

  const handleAccordionChange = async (index: number) => {
    if (!order?.items) return;
    const isExpanded = expandedItems.includes(index);
    if (isExpanded) {
      setExpandedItems(expandedItems.filter((i) => i !== index));
    } else {
      setExpandedItems([...expandedItems, index]);
      const item = order?.items[index];
      const user = session?.user as ExtendedUser;
      if (
        item?.vendor_id &&
        !loadedVendors[item.vendor_id] &&
        user?.tenant_id
      ) {
        setLoadedVendors((prev) => ({ ...prev, [item.vendor_id]: true }));
        setVendorData((prev) => ({
          ...prev,
          [item.vendor_id]: { vendor: null, loading: true },
        }));

        try {
          const vendor = await fetchVendor(item.vendor_id, {
            "X-Tenant-ID": user.tenant_id,
          });
          setVendorData((prev) => ({
            ...prev,
            [item.vendor_id]: { vendor, loading: false },
          }));
        } catch (error) {
          setVendorData((prev) => ({
            ...prev,
            [item.vendor_id]: { vendor: null, loading: false },
          }));
        }
      }
    }
  };

  const handleRefund = async (refundData: {
    items: { item_id: string; quantity: number }[];
    reason: string;
  }) => {
    if (!order?.order_id || !session?.user) return;

    setIsProcessingRefund(true);
    try {
      const user = session.user as any;
      const headers = { "X-Tenant-ID": user.tenant_id };

      const payload = {
        issued_by: user.name || user.email || "Admin",
        refund_data: {
          items: refundData.items,
          reason: refundData.reason,
        },
      };

      await createRefund(order.order_id, payload, headers);
      toast.success("Refund processed successfully");
      setShowRefundModal(false);

      // Refresh order data to show updated refunds
      await fetchOrder(order.order_id, headers);

      // Set refresh flag for orders list
      localStorage.setItem("ordersNeedRefresh", "true");
    } catch (error: any) {

      // Handle specific API error messages
      if (error?.response?.status === 400 && error?.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to process refund";
        toast.error(errorMessage);
      }
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleCompleteRefund = async () => {
    if (!order?.order_id || !session?.user) return;

    setIsCompletingRefund(true);
    try {
      const user = session.user as any;
      const headers = { "X-Tenant-ID": user.tenant_id };

      await updateOrderStatus(order.order_id, "refunded", headers);
      toast.success("Refund completed successfully");
      setShowCompleteRefundConfirm(false);

      // Refresh order data to show updated status
      await fetchOrder(order.order_id, headers);

      // Set refresh flag for orders list
      localStorage.setItem("ordersNeedRefresh", "true");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to complete refund";
      toast.error(errorMessage);
    } finally {
      setIsCompletingRefund(false);
    }
  };

  const allVendorsAccepted = useMemo(() => {
    return (
      order?.items &&
      order.vendor_responses &&
      order.items.every((item) => {
        const vendorResponse = order.vendor_responses?.[item.vendor_id];
        return vendorResponse && vendorResponse.status === "accept";
      })
    );
  }, [order?.items, order?.vendor_responses]);

  if (orderLoading && !order) {
    return <Spinner />;
  }

  if (orderError && !order) {
    const error = {
      status:
        typeof orderError.status === "number"
          ? orderError.status.toString()
          : "Error",
      message:
        orderError.message || "An error occurred while loading the order",
    };
    return (
      <ErrorCard
        title="Failed to load order"
        error={error}
        buttonText="Back to Orders"
        buttonAction={() => router.push("/dashboard/orders")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  return order ? (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/orders")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                <ShoppingBag className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-4 mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    Order #{order?.order_number}
                  </h1>
                  <Copy text={order?.order_number} size={16} />
                </div>
                <Badge variant={getStatusBadgeVariant(order?.status || "")}>
                  {order?.status || "Unknown"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Order placed: {formatDate(order?.created_at)}
              </p>
            </div>
          </div>
        </div>

        {order?.status &&
          ["pending", "processing", "confirmed", "shipped"].includes(
            order.status,
          ) && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowCancelConfirm(true)}
              >
                <X className="h-4 w-4" />
                Cancel Order
              </Button>

              <AlertDialog
                open={showCancelConfirm}
                onOpenChange={setShowCancelConfirm}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel the order. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, keep order</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        if (!order?.order_id) return;

                        try {
                          await updateOrderStatus(order.order_id, "cancelled", {
                            "X-Tenant-ID": session.user?.tenant_id,
                          });
                          toast.success("Order cancelled");
                          fetchOrder(order.order_id, {
                            "X-Tenant-ID": session.user?.tenant_id,
                          });
                        } catch (error) {
                          toast.error("Failed to cancel order");
                        }
                      }}
                    >
                      Yes, cancel order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
      </div>

      {/* Complete Refund Confirmation Dialog */}
      <AlertDialog
        open={showCompleteRefundConfirm}
        onOpenChange={setShowCompleteRefundConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Refunded?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the order as fully refunded. This action indicates
              that all refunds have been processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompletingRefund}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleCompleteRefund}
              disabled={isCompletingRefund}
            >
              {isCompletingRefund ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 p-6 space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <Tabs
            defaultValue="overview"
            className="space-y-6 w-full"
            onValueChange={handleTabChange}
            value={activeTab}
          >
            <TabsList className="w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payment">Payment & Installments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Order Notes
                    {order?.support_ticket && (
                      <Badge
                        variant="outline"
                        className="ml-auto flex items-center gap-1"
                      >
                        <TicketIcon className="h-3 w-3" />
                        Support Ticket
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground italic">
                        "{order?.notes || "No notes added"}"
                      </span>
                    </div>

                    {order?.support_ticket && (
                      <div className="border-t pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                Support Ticket
                              </span>
                              <Badge
                                variant={
                                  order.support_ticket.status === "open"
                                    ? "destructive"
                                    : order.support_ticket.status === "resolved"
                                      ? "success"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {order.support_ticket.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {order.support_ticket.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {order.support_ticket.subject}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created:{" "}
                              {formatDate(order.support_ticket.created_at)}
                            </p>
                          </div>
                          <a
                            href={`${process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL}/${order.support_ticket.chatwoot_conversation_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            View Conversation
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Order Items
                      </CardTitle>
                      <CardDescription>
                        {order?.items?.length || 0} items in this order
                      </CardDescription>
                    </div>
                    <Can permission="orders:update" role="admin">
                      {order?.status &&
                        !["cancelled", "refund_requested", "refunded"].includes(
                          order.status,
                        ) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setShowRefundModal(true)}
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Issue Refund
                          </Button>
                        )}
                    </Can>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order?.items?.map((item, index) => (
                        <React.Fragment key={index}>
                          <TableRow
                            className={`relative cursor-pointer hover:bg-muted/50 ${order.vendor_responses?.[item.vendor_id]?.status == "reject" ? "bg-amber-50 dark:bg-amber-950" : undefined}`}
                            onClick={() => handleAccordionChange(index)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-lg border bg-muted/30 flex items-center justify-center">
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium hover:text-primary">
                                    {item.name}
                                  </p>
                                  {item.product_id && (
                                    <Link
                                      href={`/dashboard/products/${item.product_id}`}
                                      target="_blank"
                                      className="flex items-center gap-1 max-w-xs group"
                                    >
                                      <p className="text-sm text-muted-foreground truncate group-hover:text-primary group-hover:underline">
                                        Product ID: {item.product_id}
                                      </p>
                                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {item.sku || "N/A"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{item.quantity}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPrice(
                                item.unit_price,
                                order?.currency || "TZS",
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPrice(
                                item.total,
                                order?.currency || "TZS",
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <EllipsisVertical />
                            </TableCell>
                          </TableRow>
                          {expandedItems.includes(index) && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="bg-muted/30 p-4"
                              >
                                <VendorResponseItem
                                  vendorId={item.vendor_id}
                                  response={
                                    order.vendor_responses?.[
                                      item.vendor_id
                                    ] || {
                                      status: "pending",
                                      responded_at: undefined,
                                    }
                                  }
                                  vendor={
                                    vendorData[item.vendor_id]?.vendor ||
                                    undefined
                                  }
                                  isLoading={
                                    vendorData[item.vendor_id]?.loading || false
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {order?.refunds && order.refunds.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <RefreshCcw className="h-5 w-5" />
                          Refunds
                        </CardTitle>
                        <CardDescription>
                          History of refunds processed for this order
                        </CardDescription>
                      </div>
                      {order.status !== "refunded" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() =>
                                  setShowCompleteRefundConfirm(true)
                                }
                                disabled={isCompletingRefund}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Mark as Refunded
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Mark all refunds as processed and update order
                                status
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.refunds.map((refund, index) => (
                        <div
                          key={index}
                          className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            {order.status != "refunded" ? (
                              <Badge className="capitalize">Pending</Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="capitalize"
                              >
                                Refunded
                              </Badge>
                            )}
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(refund.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Refund Amount
                            </p>
                            <p className="font-medium text-destructive">
                              {formatPrice(
                                refund.amount,
                                order?.currency || "TZS",
                              )}
                            </p>
                          </div>
                          {refund.reason && (
                            <div className="mt-2 text-sm text-muted-foreground border-t pt-2">
                              <p className="font-medium mb-1">
                                Reason for Refund:
                              </p>
                              <p className="text-sm">{refund.reason}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payment" className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        Payment Details
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {transactions.length > 0 ? (
                          <span className="text-sm">
                            {transactions.length} payment
                            {transactions.length !== 1 ? "s" : ""} found
                          </span>
                        ) : (
                          "No payment records found"
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {transactions && transactions.length > 0 && (
                  <div className="border-b">
                    <h3 className="text-sm font-medium p-4">Payment History</h3>
                    <Accordion
                      type="single"
                      collapsible
                      value={expandedTransaction || undefined}
                      onValueChange={setExpandedTransaction}
                      className="w-full"
                    >
                      {transactions.map((transaction: any) => (
                        <AccordionItem
                          key={transaction.transaction_id}
                          value={transaction.transaction_id}
                          className="border-b"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                            <div className="flex w-full items-center justify-between pr-2">
                              <div className="text-left">
                                <div className="font-medium">
                                  {formatPrice(transaction.amount, {
                                    currency: order?.currency || "TZS",
                                  })}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(
                                    new Date(
                                      transaction.payment_date ||
                                        transaction.created_at,
                                    ),
                                    "MMM d, yyyy h:mm a",
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium flex items-center gap-1">
                                  {transaction.transaction_id}
                                  <Copy
                                    text={transaction.transaction_id}
                                    size={14}
                                  />
                                </div>
                                <Badge
                                  variant={getTransactionStatusBadgeVariant(
                                    transaction.status as any,
                                  )}
                                  className="text-xs"
                                >
                                  {String(transaction.status).replace(
                                    /_/g,
                                    " ",
                                  )}
                                </Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-0 pt-2">
                            <div className="px-4 pb-4">
                              {loadingTransactionId ===
                              transaction.transaction_id ? (
                                <div className="py-8">
                                  <Spinner />
                                </div>
                              ) : currentTransaction?.transaction_id ===
                                transaction.transaction_id ? (
                                <div className="space-y-6">
                                  {/* Payment Summary Card */}
                                  <div className="bg-muted/30 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                      <CreditCard className="h-4 w-4" />
                                      PAYMENT SUMMARY
                                    </h4>
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center">
                                        <div className="space-y-0.5">
                                          <p className="text-sm text-muted-foreground">
                                            Amount Paid
                                          </p>
                                          <p className="text-lg font-semibold">
                                            {formatPrice(
                                              currentTransaction.amount,
                                              {
                                                currency:
                                                  order?.currency || "TZS",
                                              },
                                            )}
                                          </p>
                                        </div>
                                        {currentTransaction.fee_amount > 0 && (
                                          <div className="text-right">
                                            <p className="text-sm text-muted-foreground">
                                              Fee
                                            </p>
                                            <p className="text-sm">
                                              {formatPrice(
                                                currentTransaction.fee_amount,
                                                {
                                                  currency:
                                                    order?.currency || "TZS",
                                                },
                                              )}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      {currentTransaction.payment_date && (
                                        <div className="pt-2 border-t flex items-center justify-between text-sm">
                                          <span className="text-muted-foreground">
                                            Status
                                          </span>
                                          <Badge
                                            variant={getTransactionStatusBadgeVariant(
                                              currentTransaction.status as any,
                                            )}
                                            className="capitalize"
                                          >
                                            {String(currentTransaction.status)
                                              .replace(/_/g, " ")
                                              .toLowerCase()}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Transaction Details Card */}
                                  <div className="bg-muted/5 border rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      TRANSACTION DETAILS
                                    </h4>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <p className="text-sm text-muted-foreground">
                                            Reference
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">
                                              {currentTransaction.reference ||
                                                "N/A"}
                                            </p>
                                            <Copy
                                              text={
                                                currentTransaction.reference ||
                                                ""
                                              }
                                              className="text-muted-foreground hover:text-foreground transition-colors"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-sm text-muted-foreground">
                                            Payment Method
                                          </p>
                                          <p className="text-sm">
                                            {currentTransaction.raw_request
                                              ?.payment_method ||
                                              "Mobile Money"}
                                          </p>
                                        </div>
                                        {currentTransaction.raw_request
                                          ?.customer_msisdn && (
                                          <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">
                                              Customer Phone
                                            </p>
                                            <div className="flex items-center gap-2">
                                              <a
                                                href={`tel:${currentTransaction.raw_request.customer_msisdn}`}
                                                className="text-sm hover:underline hover:text-primary transition-colors"
                                              >
                                                {
                                                  currentTransaction.raw_request
                                                    .customer_msisdn
                                                }
                                              </a>
                                              <Copy
                                                text={
                                                  currentTransaction.raw_request
                                                    .customer_msisdn
                                                }
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        <div className="space-y-1">
                                          <p className="text-sm text-muted-foreground">
                                            {currentTransaction.payment_date
                                              ? "Completed"
                                              : "Initiated"}
                                          </p>
                                          <p className="text-sm">
                                            {formatTransactionDate(
                                              currentTransaction.payment_date ||
                                                currentTransaction.created_at,
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Raw Response */}
                                  {currentTransaction.raw_response && (
                                    <div className="bg-muted/5 border rounded-lg overflow-hidden">
                                      <Accordion type="single" collapsible>
                                        <AccordionItem
                                          value="raw-response"
                                          className="border-0"
                                        >
                                          <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline hover:bg-muted/30">
                                            <div className="flex items-center gap-2">
                                              <Code2 className="h-4 w-4" />
                                              <span>View Raw Response</span>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="px-4 pb-4 pt-0">
                                            <div className="bg-muted/30 p-3 rounded-md overflow-x-auto max-h-60">
                                              <pre className="text-xs">
                                                {JSON.stringify(
                                                  currentTransaction.raw_response,
                                                  (key, value) =>
                                                    typeof value === "string" &&
                                                    value.length > 100
                                                      ? `${value.substring(
                                                          0,
                                                          100,
                                                        )}...`
                                                      : value,
                                                  2,
                                                )}
                                              </pre>
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {/* Installment Plan Card - Only show if order has a plan */}
                {order?.plan && (
                  <div className="border-t">
                    <Card className="border-0 rounded-none">
                      <CardHeader className="p-6 pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            Installment Plan
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="px-2.5">
                              {order.payment_details?.paid_installments || 0}/
                              {order.plan.installments?.length || 0} Paid
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-6 pb-6 pt-0">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {order.plan.name || "Installment Plan"}
                              </p>
                              {order.plan.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {order.plan.description}
                                </p>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {order.plan.installments?.length || 0}{" "}
                              installments
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Payment Progress
                              </span>
                              <span className="font-medium">
                                {Math.round(
                                  ((order.payment_details?.paid_installments ||
                                    0) /
                                    (order.plan.installments?.length || 1)) *
                                    100,
                                )}
                                %
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${
                                    ((order.payment_details
                                      ?.paid_installments || 0) /
                                      (order.plan.installments?.length || 1)) *
                                    100
                                  }%`,
                                  transition: "width 0.3s ease-in-out",
                                }}
                              />
                            </div>
                          </div>

                          {/* Installment Summary */}
                          <div className="border rounded-md">
                            <Accordion type="single" collapsible>
                              <AccordionItem
                                value="installment-details"
                                className="border-b-0"
                              >
                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                                  <span className="text-sm font-medium">
                                    View Installment Details
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4 pt-1">
                                  <div className="space-y-3 mt-2">
                                    {order.plan.installments?.map(
                                      (installment, index) => {
                                        const isPaid =
                                          index <
                                          (order.payment_details
                                            ?.paid_installments || 0);
                                        const isCurrent =
                                          index ===
                                          (order.payment_details
                                            ?.paid_installments || 0);
                                        const dueDate = new Date(
                                          installment.due_date,
                                        );
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const isOverdue =
                                          !isPaid && dueDate < today;

                                        return (
                                          <div
                                            key={index}
                                            className={`p-3 rounded-md border ${
                                              isOverdue
                                                ? "border-red-200 bg-red-50"
                                                : isCurrent
                                                  ? "border-primary/50 bg-primary/5"
                                                  : "border-border"
                                            }`}
                                          >
                                            <div className="flex justify-between items-center">
                                              <div className="flex items-center gap-3">
                                                <div
                                                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                                    isPaid
                                                      ? "bg-green-100 text-green-600"
                                                      : isOverdue
                                                        ? "bg-red-100 text-red-600"
                                                        : isCurrent
                                                          ? "bg-blue-100 text-blue-600"
                                                          : "bg-muted"
                                                  }`}
                                                >
                                                  {isPaid ? (
                                                    <Check className="h-4 w-4" />
                                                  ) : isOverdue ? (
                                                    <span className="text-xs font-medium">
                                                      !
                                                    </span>
                                                  ) : (
                                                    <span className="text-xs font-medium">
                                                      {index + 1}
                                                    </span>
                                                  )}
                                                </div>
                                                <div>
                                                  <p
                                                    className={`text-sm font-medium ${
                                                      isOverdue
                                                        ? "text-red-700"
                                                        : ""
                                                    }`}
                                                  >
                                                    Installment {index + 1}
                                                    {isOverdue && (
                                                      <span className="ml-2 text-xs text-red-500">
                                                        (Overdue)
                                                      </span>
                                                    )}
                                                  </p>
                                                  <p
                                                    className={`text-xs ${
                                                      isOverdue
                                                        ? "text-red-500"
                                                        : "text-muted-foreground"
                                                    }`}
                                                  >
                                                    Due{" "}
                                                    {dueDate.toLocaleDateString()}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <p
                                                  className={`font-medium ${
                                                    isOverdue
                                                      ? "text-red-700"
                                                      : ""
                                                  }`}
                                                >
                                                  {formatPrice(
                                                    installment.amount,
                                                    {
                                                      currency:
                                                        order?.currency ||
                                                        "TZS",
                                                    },
                                                  )}
                                                </p>
                                                <p
                                                  className={`text-xs ${
                                                    isPaid
                                                      ? "text-green-600"
                                                      : isOverdue
                                                        ? "text-red-600 font-medium"
                                                        : isCurrent
                                                          ? "text-blue-600 font-medium"
                                                          : "text-muted-foreground"
                                                  }`}
                                                >
                                                  {isPaid
                                                    ? "Paid"
                                                    : isOverdue
                                                      ? "Overdue"
                                                      : isCurrent
                                                        ? "Upcoming"
                                                        : "Pending"}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          <div className="w-full space-y-6 lg:w-1/3">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      {formatPrice(
                        order?.totals?.subtotal,
                        order?.currency || "TZS",
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-destructive">
                      -
                      {formatPrice(
                        order?.totals?.discount,
                        order?.currency || "TZS",
                      ) || `${order?.currency || "TZS"} 0.00`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">
                      {formatPrice(
                        order?.totals?.tax,
                        order?.currency || "TZS",
                      ) || `${order?.currency || "TZS"} 0.00`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {formatPrice(
                        order?.totals?.shipping,
                        order?.currency || "TZS",
                      ) || `${order?.currency || "TZS"} 0.00`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-lg font-bold">
                      {formatPrice(
                        order?.totals?.total,
                        order?.currency || "TZS",
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
                <CardDescription>
                  Contact details of the customer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {order?.shipping_address && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Name</span>
                      </div>
                      <p className="text-sm font-medium">
                        {`${order.shipping_address.first_name} ${order.shipping_address.last_name}`}
                      </p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Email</span>
                      </div>
                      <a
                        href={`mailto:${order.shipping_address.email}`}
                        className="text-sm font-medium hover:text-primary hover:underline flex items-center gap-1"
                      >
                        {order.shipping_address.email}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Phone</span>
                      </div>
                      <a
                        href={`tel:${order.shipping_address.phone}`}
                        className="text-sm font-medium hover:text-primary hover:underline flex items-center gap-1"
                      >
                        {order.shipping_address.phone}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Information
                </CardTitle>
                <CardDescription>Delivery address and details</CardDescription>
              </CardHeader>
              <CardContent>
                {order?.shipping_address && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Address</span>
                      <p className="text-sm text-right">
                        {order.shipping_address.address_line1}
                        {order.shipping_address.address_line2 && (
                          <span className="block text-muted-foreground">
                            {order.shipping_address.address_line2}
                          </span>
                        )}
                      </p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">City</span>
                      <p className="text-sm">{order.shipping_address.city}</p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        State/Province
                      </span>
                      <p className="text-sm">
                        {order.shipping_address.state_province}
                      </p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Postal Code</span>
                      <Badge variant="outline" className="font-mono">
                        {order.shipping_address.postal_code}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {isModuleEnabled('delivery') ? (
              <DeliveryManagement
                order={order}
                delivery_details={order?.delivery_details}
                allVendorsAccepted={allVendorsAccepted || false}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Delivery Management
                  </CardTitle>
                  <CardDescription>
                    This feature requires the Delivery module to be enabled.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <p>Contact your administrator to enable the Delivery module.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Refund Modal */}
      <RefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        orderItems={order?.items || []}
        onConfirm={handleRefund}
        isProcessing={isProcessingRefund}
      />
    </div>
  ) : null;
};

export default OrderPage;
