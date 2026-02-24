import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  TruckIcon,
  PackageIcon,
  ShieldX,
  RefreshCcw,
  Clock,
  Ban
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OrderStatusBadge } from "./order-status-badge";
import { useOrderStore } from "../store";
import { Order, OrderStatus } from "../types";

interface OrderTableProps {
  orders: Order[];
  onViewDetails?: (order: Order) => void;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
}

export function OrderTable({
  orders,
  onViewDetails,
  onStatusChange,
}: OrderTableProps) {
  const router = useRouter();
  const { updateOrderStatus } = useOrderStore();
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedAction, setSelectedAction] = useState<OrderStatus | null>(null);

  const formatCurrency = (amount: number, currency = "TZS") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get the status icon based on order status
  const getStatusIcon = (status: string) => {
    const statusIcons: Record<string, any> = {
      "pending": <Clock className="h-4 w-4 mr-1" />,
      "processing": <PackageIcon className="h-4 w-4 mr-1" />,
      "confirmed": <CheckCircle className="h-4 w-4 mr-1" />,
      "shipped": <TruckIcon className="h-4 w-4 mr-1" />,
      "delivered": <CheckCircle className="h-4 w-4 mr-1" />,
      "completed": <CheckCircle className="h-4 w-4 mr-1" />,
      "cancelled": <Ban className="h-4 w-4 mr-1" />,
      "refunded": <RefreshCcw className="h-4 w-4 mr-1" />,
      "partially_refunded": <RefreshCcw className="h-4 w-4 mr-1" />,
    };

    return statusIcons[status] || <ShieldX className="h-4 w-4 mr-1" />;
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    const variantMap: Record<string, string> = {
      "pending": "outline",
      "processing": "secondary",
      "confirmed": "default",
      "shipped": "primary",
      "delivered": "secondary",
      "completed": "success",
      "cancelled": "destructive",
      "refunded": "warning",
      "partially_refunded": "warning",
    };

    return variantMap[status] || "secondary";
  };

  // Process the actual status change
  const processStatusChange = (order: Order, newStatus: OrderStatus) => {
    if (onStatusChange) {
      onStatusChange(order.order_id, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
    } else {
      // Fallback to the built-in function if onStatusChange is not provided
      updateOrderStatus(order.order_id, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
    }
  };

  // Handle refund confirmation
  const handleRefund = () => {
    if (!selectedOrder || !selectedAction) return;
    processStatusChange(selectedOrder, selectedAction);
    setIsRefundDialogOpen(false);
    setSelectedOrder(null);
    setSelectedAction(null);
  };

  // Handle cancel confirmation
  const handleCancel = () => {
    if (!selectedOrder || !selectedAction) return;
    processStatusChange(selectedOrder, selectedAction);
    setIsCancelDialogOpen(false);
    setSelectedOrder(null);
    setSelectedAction(null);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.order_id}
              className={`cursor-pointer ${order?.support_ticket?.status == 'open' ? "bg-amber-50 dark:bg-amber-950" : undefined}`}
              onClick={() => onViewDetails(order)}
            >
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span>#{order.order_number}</span>
                    {((order as any).flagged || (order as any).is_flagged) && (
                      <Badge variant="destructive" className="ml-1">
                        Issue
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Order ID: {order.order_id}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>
                    {order.shipping_address.first_name}{" "}
                    {order.shipping_address.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {order.shipping_address.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default">
                      {format(new Date(order.created_at), "dd MMM, yyyy HH:mm")}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Order placed: {format(new Date(order.created_at), "dd MMM, yyyy HH:mm")}</p>
                      {order.updated_at && <p>Last update: {format(new Date(order.updated_at), "dd MMM, yyyy HH:mm")}</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusVariant(order.status) as "default" | "destructive" | "outline" | "secondary"}
                  className="flex items-center whitespace-nowrap"
                >
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{order.status.replace(/_/g, ' ')}</span>
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  <Badge
                    variant={order.payment_status === "paid" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {order.payment_status}
                  </Badge>
                  {(order as any).plan && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                      {Math.round(
                        ((typeof (order as any).plan.paid_amount === 'string' ? parseFloat((order as any).plan.paid_amount) : ((order as any).plan.paid_amount || 0)) /
                          (typeof (order as any).plan.total_amount === 'string' ? parseFloat((order as any).plan.total_amount) : ((order as any).plan.total_amount || 1))) * 100
                      )}% Paid
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {formatCurrency(order.totals.total, order.currency)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                    {onViewDetails && (
                      <DropdownMenuItem onClick={() => onViewDetails(order)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                    )}

                    {/* Order Status Actions */}
                    {/* {getAvailableActions(order).length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Clock className="mr-2 h-4 w-4" />
                            Update Status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {getAvailableActions(order).map((action) => (
                                <DropdownMenuItem 
                                  key={action}
                                  onClick={() => handleStatusChange(order, action)}
                                >
                                  {getStatusIcon(action)}
                                  <span className="capitalize">{action.replace(/_/g, ' ')}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      </>
                    )} */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                No orders found matching your criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <>
                  Are you sure you want to issue a refund for order #{selectedOrder.order_number}?
                  This action cannot be undone.
                  <div className="mt-2 p-2 border rounded bg-muted">
                    <p>Order Total: {formatCurrency(selectedOrder.totals.total, selectedOrder.currency)}</p>
                    <p>Customer: {selectedOrder.shipping_address.first_name} {selectedOrder.shipping_address.last_name}</p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRefundDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefund}>
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <>
                  Are you sure you want to cancel order #{selectedOrder.order_number}?
                  This action cannot be undone.
                  <div className="mt-2 p-2 border rounded bg-muted">
                    <p>Order Total: {formatCurrency(selectedOrder.totals.total, selectedOrder.currency)}</p>
                    <p>Current Status: <span className="capitalize">{selectedOrder.status.replace(/_/g, ' ')}</span></p>
                    <p>Customer: {selectedOrder.shipping_address.first_name} {selectedOrder.shipping_address.last_name}</p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              No, Keep Order
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Yes, Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
