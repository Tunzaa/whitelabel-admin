import React, { useState } from "react";
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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Eye,
  FileEdit,
  CheckCircle2,
  XCircle,
  Power,
  PowerOff,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Affiliate } from "../types"; // Assuming Affiliate type is defined here
import { format } from "date-fns"; // For consistent date formatting
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
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { Can } from "@/components/auth/can";

interface AffiliateTableProps {
  affiliates: Affiliate[];
  onAffiliateClick: (affiliate: Affiliate) => void;
  onStatusChange: (
    affiliateId: string,
    action: "approve" | "reject" | "activate" | "deactivate",
    rejectionReason?: string,
  ) => Promise<void>;
  activeTab?: string; // To potentially adjust available actions
}

export function AffiliateTable({
  affiliates,
  onAffiliateClick,
  onStatusChange,
  activeTab = "all",
}: AffiliateTableProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();
  const [actionBeingProcessed, setActionBeingProcessed] = useState<
    string | null
  >(null);

  const handleLocalStatusChange = async (
    affiliateId: string | undefined,
    action: "approve" | "reject" | "activate" | "deactivate",
  ) => {
    if (!onStatusChange || !affiliateId) return;
    setProcessingId(affiliateId);
    await onStatusChange(affiliateId, action);
    setProcessingId(null);
  };

  const getRejectionReasonText = (type: string) => {
    switch (type) {
      case "incomplete_information":
        return "Incomplete Information: Required affiliate details are missing or unclear.";
      case "policy_violation":
        return "Policy Violation: Affiliate practices do not align with platform policies.";
      case "suspected_fraud":
        return "Suspected Fraudulent Activity: Concerns about the legitimacy of the affiliate.";
      case "other":
        return "Other reason not specified.";
      default:
        return type; // For custom reasons already processed
    }
  };

  const formatDateSafely = (dateString?: string | Date): string => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "PPpp"); // e.g., Sep 28, 2023, 12:00:00 PM
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  const getApprovalStatusBadge = (affiliate: Affiliate) => {
    if (affiliate.status === "rejected") {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (affiliate.status === "pending") {
      return <Badge variant="outline">Pending</Badge>;
    }
    if (affiliate.status === "approved") {
      return <Badge variant="secondary">Approved</Badge>;
    }
    return <Badge variant="outline">{affiliate.status || "Unknown"}</Badge>;
  };

  const getInitials = (name?: string) => {
    if (!name) return "N/A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (!affiliates) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>No affiliate data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex-grow flex flex-col">
      <div className="rounded-md border overflow-auto flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Affiliate Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Approval Status</TableHead>
              {/* <TableHead>Status</TableHead> */}
              <TableHead>Date Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No affiliates found for the current filters.
                </TableCell>
              </TableRow>
            ) : (
              affiliates.map((affiliate) => (
                <TableRow
                  key={affiliate.id}
                  onClick={() => onAffiliateClick(affiliate)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={affiliate.user?.profile_image_url}
                        alt={affiliate.name}
                      />
                      <AvatarFallback>
                        {getInitials(affiliate.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {affiliate.name || "N/A"}
                  </TableCell>
                  <TableCell>{affiliate.email || "N/A"}</TableCell>
                  <TableCell>{affiliate.phone || "N/A"}</TableCell>
                  <TableCell>{getApprovalStatusBadge(affiliate)}</TableCell>
                  {/* <TableCell>{getStatusBadge(affiliate)}</TableCell> */}
                  <TableCell>
                    {formatDateSafely(affiliate.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => onAffiliateClick(affiliate)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <Can permission="affiliates:update">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/affiliates/${affiliate.id}/edit`,
                              )
                            }
                          >
                            <FileEdit className="mr-2 h-4 w-4" /> Edit Affiliate
                          </DropdownMenuItem>
                        </Can>
                        <DropdownMenuSeparator />
                        {affiliate.status === "pending" && (
                          <>
                            <Can permission="affiliates:update">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleLocalStatusChange(
                                    affiliate.id,
                                    "approve",
                                  )
                                }
                                disabled={processingId === affiliate.id}
                              >
                                {processingId === affiliate.id &&
                                actionBeingProcessed === "approve" ? (
                                  <Spinner size="sm" className="mr-2 h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                )}
                                Approve
                              </DropdownMenuItem>
                            </Can>
                            <Can permission="affiliates:update">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleLocalStatusChange(
                                    affiliate.id,
                                    "reject",
                                  )
                                }
                                disabled={processingId === affiliate.id}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                {processingId === affiliate.id &&
                                actionBeingProcessed === "reject" ? (
                                  <Spinner size="sm" className="mr-2 h-4 w-4" />
                                ) : (
                                  <XCircle className="mr-2 h-4 w-4" />
                                )}
                                Reject
                              </DropdownMenuItem>
                            </Can>
                          </>
                        )}
                        {/* {affiliate.status === "approved" && affiliate.is_active && (
                          <DropdownMenuItem
                            onClick={() => handleLocalStatusChange(affiliate.id, 'deactivate')}
                            disabled={processingId === affiliate.id}
                          >
                            {processingId === affiliate.id && actionBeingProcessed === 'deactivate' ? (
                              <Spinner size="sm" className="mr-2 h-4 w-4" />
                            ) : (
                              <PowerOff className="mr-2 h-4 w-4" />
                            )}
                            Deactivate
                          </DropdownMenuItem>
                        )}
                        {affiliate.status === "approved" && !affiliate.is_active && (
                          <DropdownMenuItem
                            onClick={() => handleLocalStatusChange(affiliate.id, 'activate')}
                            disabled={processingId === affiliate.id}
                          >
                            {processingId === affiliate.id && actionBeingProcessed === 'activate' ? (
                              <Spinner size="sm" className="mr-2 h-4 w-4" />
                            ) : (
                              <Power className="mr-2 h-4 w-4 text-green-500" />
                            )}
                            Activate
                          </DropdownMenuItem>
                        )} */}
                        {affiliate.status === "approved" && (
                          <Can permission="affiliates:update">
                            <DropdownMenuItem
                              onClick={() =>
                                handleLocalStatusChange(affiliate.id, "reject")
                              }
                              disabled={processingId === affiliate.id}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              {processingId === affiliate.id &&
                              actionBeingProcessed === "reject" ? (
                                <Spinner size="sm" className="mr-2 h-4 w-4" />
                              ) : (
                                <XCircle className="mr-2 h-4 w-4" />
                              )}
                              Reject
                            </DropdownMenuItem>
                          </Can>
                        )}
                        {affiliate.status === "rejected" && (
                          <Can permission="affiliates:update">
                            <DropdownMenuItem
                              onClick={() =>
                                handleLocalStatusChange(affiliate.id, "approve")
                              }
                              disabled={processingId === affiliate.id}
                            >
                              {processingId === affiliate.id &&
                              actionBeingProcessed === "approve" ? (
                                <Spinner size="sm" className="mr-2 h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                              )}
                              Approve
                            </DropdownMenuItem>
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
      {/* Pagination is now handled by the parent page */}
    </div>
  );
}
