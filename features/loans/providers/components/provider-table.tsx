"use client";

import React from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";

import { LoanProvider } from "../types";
import { Can } from "@/components/auth/can";

interface ProviderTableProps {
  providers: LoanProvider[];
  onEdit?: (provider: LoanProvider) => void;
  onView?: (provider: LoanProvider) => void;
  onStatusChange?: (providerId: string, isActive: boolean) => void;
}

export function ProviderTable({
  providers,
  onEdit,
  onView,
  onStatusChange,
}: ProviderTableProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [selectedProvider, setSelectedProvider] =
    React.useState<LoanProvider | null>(null);
  const [statusAction, setStatusAction] = React.useState<
    "activate" | "deactivate" | null
  >(null);

  const handleStatusAction = (
    provider: LoanProvider,
    action: "activate" | "deactivate",
  ) => {
    setSelectedProvider(provider);
    setStatusAction(action);
    setConfirmDialogOpen(true);
  };

  const confirmStatusChange = () => {
    if (selectedProvider && statusAction && onStatusChange) {
      onStatusChange(selectedProvider.provider_id, statusAction === "activate");
    }
    setConfirmDialogOpen(false);
  };

  const handleRowClick = (provider: LoanProvider) => {
    if (onView) {
      onView(provider);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="hidden md:table-cell">
                Description
              </TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No loan providers found
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => (
                <TableRow
                  key={provider.provider_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(provider)}
                >
                  <TableCell className="font-medium">{provider.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{provider.contact_email}</span>
                      <span className="text-muted-foreground text-sm">
                        {provider.contact_phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="max-w-[300px] truncate">
                      {provider.description}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {provider.created_at
                      ? format(new Date(provider.created_at), "MMM d, yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={provider.is_active ? "success" : "secondary"}
                      className={
                        provider.is_active
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : ""
                      }
                    >
                      {provider.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
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
                        {onView && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(provider);
                            }}
                          >
                            View details
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <Can permission="vendor-loans:update">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(provider);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </Can>
                        )}
                        {onStatusChange && (
                          <Can permission="vendor-loans:update">
                            <DropdownMenuSeparator />
                            {provider.is_active ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusAction(provider, "deactivate");
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusAction(provider, "activate");
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
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
              {statusAction === "activate"
                ? "Activate Provider"
                : "Deactivate Provider"}
            </DialogTitle>
            <DialogDescription>
              {statusAction === "activate"
                ? "Are you sure you want to activate this loan provider? This will make their loan products available to vendors."
                : "Are you sure you want to deactivate this loan provider? This will make their loan products unavailable to vendors."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant={statusAction === "activate" ? "default" : "destructive"}
              onClick={confirmStatusChange}
            >
              {statusAction === "activate" ? "Activate" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
