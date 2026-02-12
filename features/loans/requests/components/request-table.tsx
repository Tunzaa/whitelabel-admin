import React from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { LoanRequest } from "../types";
import { compactCurrency } from "@/lib/utils";
import { Can } from "@/components/auth/can";

const formatDate = (
  date: string | Date | undefined,
  format: "short" | "medium" | "long" = "medium",
): string => {
  if (!date) return "N/A";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: format === "short" ? "short" : "long",
    day: "numeric",
  };

  if (format === "long") {
    options.hour = "numeric";
    options.minute = "numeric";
    options.hour12 = true;
  }

  return new Intl.DateTimeFormat("en-US", options).format(dateObj);
};

interface RequestTableProps {
  requests: LoanRequest[];
  onView: (request: LoanRequest) => void;
  onStatusChange?: (requestId: string, status: string) => void;
}

export function RequestTable({
  requests,
  onView,
  onStatusChange,
}: RequestTableProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] =
    React.useState<LoanRequest | null>(null);
  const [statusAction, setStatusAction] = React.useState<
    "approve" | "reject" | "disburse" | null
  >(null);

  const handleStatusAction = (
    request: LoanRequest,
    action: "approve" | "reject" | "disburse",
  ) => {
    setSelectedRequest(request);
    setStatusAction(action);
    setConfirmDialogOpen(true);
  };

  const confirmStatusChange = () => {
    if (selectedRequest && statusAction && onStatusChange) {
      let newStatus = "";
      switch (statusAction) {
        case "approve":
          newStatus = "approved";
          break;
        case "reject":
          newStatus = "rejected";
          break;
        case "disburse":
          newStatus = "disbursed";
          break;
      }
      onStatusChange(selectedRequest.request_id, newStatus);
    }
    setConfirmDialogOpen(false);
  };

  const handleRowClick = (request: LoanRequest) => {
    if (onView) {
      onView(request);
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;

    switch (status.toLowerCase()) {
      case "pending":
        return (
          <Badge
            variant="warning"
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "disbursed":
        return (
          <Badge
            variant="success"
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Disbursed
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant="outline"
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            Paid
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionItems = (request: LoanRequest) => {
    const status = request.status.toLowerCase();
    const items = [];

    if (status === "pending") {
      items.push(
        <DropdownMenuItem
          key="approve"
          onClick={(e) => {
            e.stopPropagation();
            handleStatusAction(request, "approve");
          }}
        >
          <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
          Approve
        </DropdownMenuItem>,
      );

      items.push(
        <DropdownMenuItem
          key="reject"
          className="text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleStatusAction(request, "reject");
          }}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </DropdownMenuItem>,
      );
    } else if (status === "approved") {
      items.push(
        <DropdownMenuItem
          key="disburse"
          onClick={(e) => {
            e.stopPropagation();
            handleStatusAction(request, "disburse");
          }}
        >
          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
          Mark as Disbursed
        </DropdownMenuItem>,
      );
    }

    return items;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Request Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-6 text-muted-foreground"
                >
                  No loan requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow
                  key={request.request_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(request)}
                >
                  <TableCell className="font-medium">
                    {request.request_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {request.vendor_name || "Unknown Vendor"}
                  </TableCell>
                  <TableCell>
                    {request.product_name || "Unknown Product"}
                  </TableCell>
                  <TableCell>{compactCurrency(request.loan_amount)}</TableCell>
                  <TableCell>
                    {request.created_at
                      ? formatDate(request.created_at)
                      : "N/A"}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(request);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View details
                        </DropdownMenuItem>

                        {onStatusChange &&
                          getActionItems(request).length > 0 && (
                            <Can permission="vendor-loans:update">
                              <DropdownMenuSeparator />
                              {getActionItems(request)}
                            </Can>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction === "approve"
                ? "Approve Loan Request"
                : statusAction === "reject"
                  ? "Reject Loan Request"
                  : "Mark Loan as Disbursed"}
            </DialogTitle>
            <DialogDescription>
              {statusAction === "approve"
                ? "Are you sure you want to approve this loan request? This will allow the loan to be disbursed."
                : statusAction === "reject"
                  ? "Are you sure you want to reject this loan request? This action cannot be undone."
                  : "Are you sure you want to mark this loan as disbursed? This indicates funds have been transferred to the vendor."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant={statusAction === "reject" ? "destructive" : "default"}
              onClick={confirmStatusChange}
            >
              {statusAction === "approve"
                ? "Approve"
                : statusAction === "reject"
                  ? "Reject"
                  : "Mark as Disbursed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
