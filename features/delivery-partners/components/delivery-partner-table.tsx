"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, MoreHorizontal, X, Eye, XCircle, Edit } from "lucide-react";
import { format } from "date-fns";
import { DeliveryPartner } from "../types";
import { Spinner } from "@/components/ui/spinner";
import { DeliveryPartnerRejectionModal } from "./delivery-partner-rejection-modal";
import { Can } from "@/components/auth/can";

interface DeliveryPartnerTableProps {
  deliveryPartners: DeliveryPartner[];
  onPartnerClick: (partner: DeliveryPartner) => void;
  onPartnerEdit: (partner: DeliveryPartner) => void;
  onStatusChange: (partnerId: string, payload: any) => Promise<void>;
  activeTab?: string;
}

const rejectionReasonsMap: { [key: string]: string } = {
  incomplete_kyc: "Incomplete KYC",
  invalid_vehicle_info: "Invalid Vehicle Information",
  background_check_failed: "Background Check Failed",
  policy_violation: "Policy Violation",
  other: "Other",
};

export function DeliveryPartnerTable({
  deliveryPartners,
  onPartnerClick,
  onPartnerEdit,
  onStatusChange,
  activeTab = "all",
}: DeliveryPartnerTableProps) {
  const isMobile = useIsMobile();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectPartnerId, setRejectPartnerId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleStatusChange = async (
    partnerId: string,
    action: "approve" | "reject" | "activate" | "deactivate",
  ) => {
    if (!onStatusChange) return;

    if (action === "reject") {
      setRejectPartnerId(partnerId);
      setShowRejectDialog(true);
      return;
    }

    let payload = {};
    switch (action) {
      case "approve":
        payload = { is_approved: true };
        break;
      case "activate":
        payload = { is_active: true };
        break;
      case "deactivate":
        payload = { is_active: false };
        break;
    }

    setProcessingId(partnerId);
    try {
      await onStatusChange(partnerId, payload);
    } catch (error) {
    } finally {
      setProcessingId(null);
    }
  };

  const getRejectionReasonText = (type: string, customReason?: string) => {
    if (type === "other") {
      return customReason || "Other";
    }
    return rejectionReasonsMap[type] || "No reason specified";
  };

  const handleRejectConfirm = async ({
    type,
    customReason,
  }: {
    type: string;
    customReason?: string;
  }) => {
    if (!rejectPartnerId || !onStatusChange) return;

    const reasonText = getRejectionReasonText(type, customReason);
    const payload = {
      is_approved: false,
      is_active: false,
      rejection_reason: reasonText,
    };

    setProcessingId(rejectPartnerId);
    setShowRejectDialog(false);
    try {
      await onStatusChange(rejectPartnerId, payload);
    } catch (error) {
    } finally {
      setProcessingId(null);
      setRejectPartnerId(null);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="success">Active</Badge>;
    }
    return (
      <Badge
        variant="outline"
        className="bg-slate-200 text-slate-800 border-slate-400"
      >
        Inactive
      </Badge>
    );
  };

  const getApprovalStatusBadge = (isApproved: boolean) => {
    if (isApproved) {
      return <Badge variant="success">Approved</Badge>;
    }
    return <Badge variant="destructive">Not Approved</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Registered
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryPartners && deliveryPartners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    No delivery partners found
                  </TableCell>
                </TableRow>
              ) : (
                deliveryPartners.map((partner) => (
                  <TableRow
                    key={partner.partner_id}
                    onClick={() => onPartnerClick(partner)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={partner.profile_picture || "/placeholder.svg"}
                            alt={partner.name || "Partner"}
                          />
                          <AvatarFallback>
                            {partner.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{partner.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Partner ID: {partner.partner_id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{partner.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {getApprovalStatusBadge(partner.is_approved ?? false)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(partner.is_active ?? false)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(partner.created_at), "PP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onPartnerClick(partner);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <Can permission="delivery-partners:update">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onPartnerEdit(partner);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Partner
                            </DropdownMenuItem>
                          </Can>
                          <DropdownMenuSeparator />

                          {/* --- Approval Actions --- */}
                          {!partner.is_approved && (
                            <>
                              {partner.kyc?.verified && (
                                <Can permission="delivery-partners:update">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(
                                        partner.partner_id,
                                        "approve",
                                      );
                                    }}
                                    disabled={
                                      processingId === partner.partner_id
                                    }
                                  >
                                    {processingId === partner.partner_id ? (
                                      <Spinner
                                        size="sm"
                                        className="mr-2 h-4 w-4"
                                      />
                                    ) : (
                                      <Check className="mr-2 h-4 w-4" />
                                    )}
                                    Approve
                                  </DropdownMenuItem>
                                </Can>
                              )}
                              <Can permission="delivery-partners:update">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(
                                      partner.partner_id,
                                      "reject",
                                    );
                                  }}
                                  disabled={processingId === partner.partner_id}
                                >
                                  {processingId === partner.partner_id ? (
                                    <Spinner
                                      size="sm"
                                      className="mr-2 h-4 w-4"
                                    />
                                  ) : (
                                    <XCircle className="mr-2 h-4 w-4" />
                                  )}
                                  Reject
                                </DropdownMenuItem>
                              </Can>
                            </>
                          )}

                          {/* --- Activation and Rejection Actions for Approved Partners --- */}
                          {partner.is_approved && (
                            <>
                              <Can permission="delivery-partners:update">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(
                                      partner.partner_id,
                                      partner.is_active
                                        ? "deactivate"
                                        : "activate",
                                    );
                                  }}
                                  disabled={processingId === partner.partner_id}
                                >
                                  {processingId === partner.partner_id ? (
                                    <Spinner
                                      size="sm"
                                      className="mr-2 h-4 w-4"
                                    />
                                  ) : partner.is_active ? (
                                    <X className="mr-2 h-4 w-4" />
                                  ) : (
                                    <Check className="mr-2 h-4 w-4" />
                                  )}
                                  {partner.is_active
                                    ? "Deactivate"
                                    : "Activate"}
                                </DropdownMenuItem>
                              </Can>
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

      <DeliveryPartnerRejectionModal
        isOpen={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={handleRejectConfirm}
        isProcessing={processingId === rejectPartnerId}
      />
    </div>
  );
}
