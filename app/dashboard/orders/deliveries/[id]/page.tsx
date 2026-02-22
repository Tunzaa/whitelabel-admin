"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ArrowLeft, User, MapPin, Phone, Calendar, Clock, Package, Truck, PackageCheck, XCircle, Info, Hourglass, Eye, Image as ImageIcon, FileText, MapPin as MapPinIcon, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy } from "@/components/ui/copy";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { EmptyPlaceholder } from "@/components/ui/empty-placeholder";
import { FilePreviewModal } from "@/components/ui/file-preview-modal";

import { useDeliveryStore } from "@/features/orders/deliveries/store";
import { useOrderStore } from "@/features/orders/store";
import { formatDate, formatTime, formatPartnerId } from "@/lib/utils";
import { withAuthorization } from "@/components/auth/with-authorization";
import { withModuleAuthorization } from "@/components/auth/with-module-authorization";

function DeliveryDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const session = useSession();
  const tenantId = session?.data?.user?.tenant_id as string | undefined;
  const { delivery, loading, storeError, fetchDelivery } = useDeliveryStore();
  const { order, fetchOrder } = useOrderStore();
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState("");

  // Fetch delivery and order details
  useEffect(() => {
    if (!params?.id) return;
    const headers = tenantId ? { "X-Tenant-ID": tenantId } : undefined;
    fetchDelivery(params.id as string, headers).then((delivery) => {
      if (delivery?.order_id) {
        fetchOrder(delivery.order_id, headers);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, tenantId]);

  if (loading || !delivery || !order) {
    return (
      <Spinner />
    );
  }

  if (storeError && !loading) {
    return (
      <ErrorCard
        title="Failed to load delivery"
        error={{ status: storeError.status?.toString() || "Error", message: storeError.message }}
        buttonText="Retry"
        buttonAction={() => fetchDelivery(params.id as string)}
        buttonIcon={ArrowLeft}
      />
    );
  }

  if (!delivery) {
    return null;
  }

  // Helper: Customer info (add email, icons, readable address)
  const CustomerInfo = () => {
    if (!order) return null;
    const addr = order.shipping_address;
    return (
      <div className="bg-muted/20 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Name:</span>
          <span>{addr.first_name} {addr.last_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Phone:</span>
          <a href={`tel:${addr.phone}`} className="hover:underline">{addr.phone}</a>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Email:</span>
          <a href={`mailto:${addr.email}`} className="hover:underline">{addr.email}</a>
        </div>
        <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <span>
            <span className="font-semibold">Address:</span> {addr.address_line1}
            {addr.address_line2 ? `, ${addr.address_line2}` : ""}, {addr.city}
            {addr.state ? `, ${addr.state}` : ""}, {addr.country}
            {addr.postal_code ? `, ${addr.postal_code}` : ""}
          </span>
        </div>
      </div>
    );
  };

  // Helper: Order items table (improved card UI)
  const OrderItemsTable = () => {
    if (!order) return null;
    return (
      <div className="bg-muted/20 rounded-lg">
        <Table className="border-0">
          <TableHeader>
            <TableRow>
              <TableHead><Package className="inline h-4 w-4 mr-1 text-muted-foreground" />Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  <Info className="inline h-4 w-4 mr-1" />No items in this order
                </TableCell>
              </TableRow>
            ) : (
              order.items.map((item) => (
                <TableRow key={item.item_id} className="hover:bg-muted/10">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">${item.unit_price}</TableCell>
                  <TableCell className="text-right font-medium">${item.total}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Timeline component (stage at top, no avatar, partner name/id below, minimal icons)
  const DeliveryTimeline = () => {
    if (!delivery.stages || delivery.stages.length === 0) {
      return (
        <EmptyPlaceholder className="my-4">
          <div className="flex flex-col items-center gap-2">
            <Info className="h-6 w-6 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">No delivery stages yet.</span>
          </div>
        </EmptyPlaceholder>
      );
    }
    // Icon mapping for stages (minimal, modern)
    const stageIcons = {
      assigned: Hourglass,
      at_pickup: Package,
      in_transit: Truck,
      delivered: PackageCheck,
      cancelled: XCircle,
      failed: Info,
      default: Hourglass,
    };
    return (
      <div className="space-y-6">
        {delivery.stages.map((stage, idx) => {
          const Icon = stageIcons[stage.stage] || stageIcons.default;
          const partner = delivery.partner_details?.[stage.partner_id];
          return (
            <div key={idx} className="flex items-start gap-4">
              {/* Timeline icon and vertical line */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                {idx < delivery.stages.length - 1 && (
                  <div className="h-8 w-px bg-border my-1" />
                )}
              </div>
              {/* Timeline content */}
              <div className="flex-1">
                <p className="font-semibold capitalize text-primary mb-1">
                  {(stage.stage === "assigned" && idx > 0 ? "reassigned" : stage.stage).replace(/_/g, " ")}
                </p>
                <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                  <span>{partner?.name || "Partner"}</span>
                  <span className="font-mono">({formatPartnerId(stage.partner_id)})</span>
                  <Copy text={stage.partner_id} size={10} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {formatDate(stage.timestamp)} at {formatTime(stage.timestamp)}
                </p>
                {stage.reason && (
                  <p className="text-xs text-muted-foreground mb-1">
                    <strong>Notes:  </strong> {stage.reason}
                  </p>
                )}
                {/* Proof image */}
                {stage.proof && typeof stage.proof === 'object' && stage.proof.photo_url && (
                  <div className="mt-1 flex items-center gap-2">
                    <img
                      src={stage.proof.photo_url}
                      alt="Proof"
                      className="h-10 w-10 rounded object-cover border cursor-pointer"
                      onClick={() => { setSelectedProof(stage.proof.photo_url); setProofModalOpen(true); }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Delivery summary info (inline, single-row, compact, visually distinct, truncated IDs)
  const DeliverySummary = () => (
    <Card className="bg-muted/30 rounded-lg shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 min-h-0">
        <CardTitle className="text-base flex items-center gap-2 font-semibold">
          <Truck className="h-4 w-4 text-primary" /> Delivery Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2 py-2 text-xs whitespace-nowrap overflow-x-auto">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Current Stage:</span>
          <Badge className="capitalize px-2 py-0.5" variant="default">{delivery.current_stage.replace(/_/g, " ")}</Badge>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-muted-foreground">Delivery ID:</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono max-w-[110px] truncate inline-block align-middle cursor-pointer bg-transparent px-1 py-0.5 border border-border rounded text-xs">
                  {delivery.id}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{delivery.id}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Copy text={delivery.id} size={12} />
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-muted-foreground">Order ID:</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono max-w-[110px] truncate inline-block align-middle cursor-pointer bg-transparent px-1 py-0.5 border border-border rounded text-xs">
                  {delivery.order_id}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{delivery.order_id}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Copy text={delivery.order_id} size={12} />
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Delivery Initiated:</span>
          <span>{formatDate(delivery.created_at)} {formatTime(delivery.created_at)}</span>
        </div>
        {delivery.actual_delivery_time && (
          <div className="flex items-center gap-1">
            <PackageCheck className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Delivered At:</span>
            <span>{formatDate(delivery.actual_delivery_time)} {formatTime(delivery.actual_delivery_time)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Order info (add notes, icons, spacing, badge)
  const OrderInfo = () => {
    if (!order) return null;
    return (
      <div className="grid grid-cols-1 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Order Number:</span>
          <span className="font-mono">{order.order_number}</span>
          <Copy text={order.order_number} size={12} />
          <div className="flex items-center gap-2">
            <Badge className="capitalize" variant="default">{order.status}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Created:</span>
          <span>{format(new Date(order.created_at), "dd MMM, yyyy HH:mm")}</span>
        </div>
        {order.notes && (
          <div className="flex items-center gap-2 col-span-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="italic text-muted-foreground">{order.notes}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - match order details page style, add 'View Order' button */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/orders/deliveries")}
            className="shrink-0 hover:bg-accent/60"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              <Truck className="h-5 w-5 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Order <span className="font-mono text-lg">#{order?.order_number || "-"}</span>
              </h1>
              {order?.order_number && <Copy text={order.order_number} size={16} />}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Order Created: {order ? format(new Date(order.created_at), "dd MMM, yyyy HH:mm") : "-"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-4 px-3 py-1 text-xs"
          onClick={() => router.push(`/dashboard/orders/${order?.order_id}`)}
          disabled={!order?.order_id}
        >
          View Order
        </Button>
      </div>
      <div className="p-4 space-y-4 overflow-auto">
        <DeliverySummary />
        {/* Main content - 2 column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left column - Timeline */}
          <div className="space-y-4 col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Delivery Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryTimeline />
              </CardContent>
            </Card>
          </div>

          {/* Right column - Order Info, Customer, Items */}
          <div className="space-y-4 col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Info</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderInfo />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderItemsTable />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Info</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerInfo />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Proof Preview Modal */}
      <FilePreviewModal
        isOpen={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        src={selectedProof}
        alt="Delivery proof"
      />
    </div>
  );
}

const DeliveryDetailsPageWithAuthorization = withModuleAuthorization(withAuthorization(DeliveryDetailsPage, { permission: "orders:read" }), "delivery");
export default DeliveryDetailsPageWithAuthorization;