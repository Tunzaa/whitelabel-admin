"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Check,
  Edit,
  Eye,
  MoreHorizontal,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Power,
} from "lucide-react";
import { VendorRejectionModal } from "./vendor-rejection-modal";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Can } from "@/components/auth/can";

import { VendorListResponse } from "../types";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface VendorTableProps {
  vendors: VendorListResponse["items"];
  onVendorClick: (vendor: VendorListResponse["items"][0]) => void;
  onStatusChange?: (
    vendorId: string,
    status: string,
    rejectionReason?: string,
  ) => Promise<void>;
  activeTab?: string;
}

export function VendorTable({
  vendors,
  onVendorClick,
  onStatusChange,
  activeTab = "all",
}: VendorTableProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectVendorId, setRejectVendorId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Filter vendors by various status combinations
  const allApprovedVendors = vendors.filter(
    (vendor) => vendor.verification_status === "approved",
  );
  const activeVendors = vendors.filter(
    (vendor) => vendor.verification_status === "approved" && vendor.is_active,
  );
  const inactiveVendors = vendors.filter(
    (vendor) => vendor.verification_status === "approved" && !vendor.is_active,
  );
  const pendingVendors = vendors.filter(
    (vendor) => vendor.verification_status === "pending",
  );
  const rejectedVendors = vendors.filter(
    (vendor) => vendor.verification_status === "rejected",
  );

  // Helper function to handle status change with loading state
  const handleStatusChange = async (
    vendorId: string | undefined,
    action: "approve" | "reject" | "activate" | "deactivate",
  ) => {
    if (!onStatusChange || !vendorId) return; // Skip if no ID or handler

    // For rejection, show the dialog instead of immediate action
    if (action === "reject") {
      setRejectVendorId(vendorId);
      setShowRejectDialog(true);
      return;
    }

    try {
      setProcessingId(vendorId);

      // Map action to the right status change according to API expectations
      let status;
      let isActive;

      switch (action) {
        case "approve":
          // API expects: status: "approved", is_active: false
          status = "approved";
          break;
        case "activate":
          // API expects: is_active: true
          status = "active"; // This will be mapped to is_active: true in the store
          break;
        case "deactivate":
          // API expects: is_active: false
          status = "inactive"; // This will be mapped to is_active: false in the store
          break;
        default:
          return;
      }

      await onStatusChange(vendorId, status);
    } catch (error) {
      console.error("Error changing vendor status:", error);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle the rejection confirmation
  const handleRejectConfirm = ({
    type,
    customReason,
  }: {
    type: string;
    customReason?: string;
  }) => {
    if (!rejectVendorId || !onStatusChange) return;

    const reason = type === "other" ? customReason : type;
    if (!reason) {
      console.error("Rejection reason is missing.");
      return;
    }

    onStatusChange(rejectVendorId, "rejected", reason);
    setShowRejectDialog(false);
    setRejectVendorId(null);
  };

  // Helper to get rejection reason text based on type
  const getRejectionReasonText = (type: string) => {
    switch (type) {
      case "incomplete_documents":
        return "Incomplete or missing verification documents";
      case "invalid_documents":
        return "Invalid or expired verification documents";
      case "business_information":
        return "Inconsistent business information";
      case "policy_violation":
        return "Violation of platform policies";
      default:
        return customReason;
    }
  };

  // Helper function to get badge variant based on status
  const getStatusBadgeVariant = (status: string, isActive: boolean = true) => {
    // If the vendor is verified but not active, show special status
    if (status === "approved" && !isActive) {
      return "outline";
    }

    switch (status) {
      case "approved":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Helper to get displayed status text
  const getStatusDisplayText = (vendor: any) => {
    if (vendor.verification_status === "approved") {
      return vendor.is_active ? "Active" : "Inactive";
    } else if (vendor.verification_status === "rejected") {
      return "Rejected";
    } else {
      return "Pending";
    }
  };

  // Format date helper with consistent formatting to prevent hydration errors
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";

    try {
      // Check if the date is in DD/MM/YYYY format
      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        return format(new Date(`${year}-${month}-${day}`), "MMM d, yyyy");
      }

      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Render table based on active tab
  const renderTable = () => {
    switch (activeTab) {
      case "active":
        return renderVendorTable(activeVendors);
      case "inactive":
        return renderVendorTable(inactiveVendors);
      case "pending":
        return renderVendorTable(pendingVendors);
      case "rejected":
        return renderVendorTable(rejectedVendors);
      case "all":
      default:
        return renderVendorTable(vendors);
    }
  };

  // Generic vendor table renderer
  const renderVendorTable = (vendorList: VendorListResponse["items"]) => {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">City</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Registered
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No vendors found
                  </TableCell>
                </TableRow>
              ) : (
                vendorList.map((vendor, index) => (
                  <TableRow
                    key={vendor.vendor_id || `vendor-${index}`}
                    onClick={() => onVendorClick(vendor)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src="/placeholder.svg"
                            alt={vendor.business_name}
                          />
                          <AvatarFallback>
                            {vendor.business_name
                              ?.substring(0, 2)
                              .toUpperCase() || "VD"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div>{vendor.business_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Vendor ID: {vendor.vendor_id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <a
                          href={`mailto:${vendor.contact_email}`}
                          className="hover:underline w-fit"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {vendor.contact_email}
                        </a>
                        {vendor.contact_phone && (
                          <a
                            href={`tel:${vendor.contact_phone}`}
                            className="text-xs text-muted-foreground hover:underline w-fit"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vendor.contact_phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {vendor.city || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          vendor.verification_status === "approved"
                            ? "bg-green-200 text-green-800"
                            : vendor.verification_status === "pending"
                              ? "bg-amber-200 text-amber-800"
                              : vendor.verification_status === "rejected"
                                ? "bg-red-200 text-red-800"
                                : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {vendor.verification_status.charAt(0).toUpperCase() +
                          vendor.verification_status.slice(1)}
                      </Badge>
                      {vendor.verification_status === "rejected" &&
                        vendor.rejection_reason && (
                          <div className="hidden group-hover:block absolute mt-1 bg-white p-2 rounded shadow-md text-xs max-w-xs z-10">
                            {vendor.rejection_reason}
                          </div>
                        )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${
                          vendor.is_active
                            ? "bg-green-200 text-green-800"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {vendor.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(vendor.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/dashboard/vendors/${vendor.vendor_id}`,
                              );
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <Can permission="vendors:update">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/dashboard/vendors/${vendor.vendor_id}/edit`,
                                );
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </Can>

                          <DropdownMenuSeparator />

                          {/* Status-specific actions */}
                          {onStatusChange && (
                            <>
                              {/* Approval / Rejection */}
                              {vendor.verification_status !== "approved" &&
                                vendor.verification_documents?.length > 0 &&
                                vendor.verification_documents.every(
                                  (doc: any) =>
                                    doc.verification_status === "verified",
                                ) && (
                                  <Can permission="vendors:update">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(
                                          vendor.vendor_id,
                                          "approve",
                                        );
                                      }}
                                      disabled={
                                        processingId === vendor.vendor_id
                                      }
                                    >
                                      {processingId === vendor.vendor_id ? (
                                        <Spinner
                                          size="sm"
                                          className="mr-2 h-4 w-4"
                                        />
                                      ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                      )}
                                      Approve
                                    </DropdownMenuItem>
                                  </Can>
                                )}
                              {vendor.verification_status !== "rejected" && (
                                <Can permission="vendors:update">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(
                                        vendor.vendor_id,
                                        "reject",
                                      );
                                    }}
                                    disabled={processingId === vendor.vendor_id}
                                  >
                                    {processingId === vendor.vendor_id ? (
                                      <Spinner
                                        size="sm"
                                        className="mr-2 h-4 w-4"
                                      />
                                    ) : (
                                      <XCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Reject
                                  </DropdownMenuItem>
                                </Can>
                              )}
                              {/* For approved vendors */}
                              {vendor.verification_status === "approved" && (
                                <Can permission="vendors:update">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(
                                        vendor.vendor_id,
                                        vendor.is_active
                                          ? "deactivate"
                                          : "activate",
                                      );
                                    }}
                                    disabled={processingId === vendor.vendor_id}
                                  >
                                    {processingId === vendor.vendor_id ? (
                                      <Spinner
                                        size="sm"
                                        className="mr-2 h-4 w-4"
                                      />
                                    ) : (
                                      <Power className="h-4 w-4 mr-2" />
                                    )}
                                    {vendor.is_active
                                      ? "Deactivate"
                                      : "Activate"}
                                  </DropdownMenuItem>
                                </Can>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {renderTable()}

      {/* Rejection Dialog */}
      <VendorRejectionModal
        isOpen={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={handleRejectConfirm}
        isProcessing={processingId === rejectVendorId}
      />
    </div>
  );
}
