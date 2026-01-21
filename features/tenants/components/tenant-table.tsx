"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tenant } from "../types";
import { useTenantStore } from "../store";
import { Card, CardContent } from "@/components/ui/card";
import { Can } from "@/components/auth/can";

interface TenantTableProps {
  tenants: Tenant[];
  onActivateTenant: (tenantId: string) => void;
  onDeactivateTenant: (tenantId: string) => void;
  isLoading?: boolean;
}

export function TenantTable({
  tenants,
  onActivateTenant,
  onDeactivateTenant,
  isLoading = false,
}: TenantTableProps) {
  const router = useRouter();

  // Handle undefined tenants
  if (!tenants || tenants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No tenants found</p>
      </div>
    );
  }

  // Format dates consistently to prevent hydration errors
  const formatDate = (dateString?: string | null) => {
    if (!dateString) {
      return "N/A";
    }
    try {
      return format(new Date(dateString), "MM/dd/yyyy");
    } catch (error) {
      console.error("Invalid date format:", dateString);
      return "Invalid Date";
    }
  };

  const getStatusBadge = (status: boolean) => {
    switch (status) {
      case true:
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case false:
        return <Badge variant="destructive">Inactive</Badge>;
    }
  };

  // Handler for table row clicks
  const handleRowClick = (tenantId: string) => {
    router.push(`/dashboard/tenants/${tenantId}`);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>Loading tenants...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  No tenants found
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TableRow
                  key={tenant.tenant_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(tenant.tenant_id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center overflow-hidden bg-muted"
                        style={{
                          backgroundColor:
                            tenant.branding?.theme?.colors?.background?.primary || "#000",
                        }}
                      >
                        {tenant.branding?.logoUrl ? (
                          <img
                            src={tenant.branding.logoUrl}
                            alt={tenant.name}
                            className="object-contain w-6 h-6"
                          />
                        ) : (
                          <span
                            className="text-sm font-medium"
                            style={{
                              color: tenant.branding?.theme?.colors?.text?.primary || "#fff",
                            }}
                          >
                            {tenant.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.domain}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="outline">{tenant.country_code}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{tenant.admin_email}</span>
                      <span className="text-xs text-muted-foreground">
                        {tenant.admin_phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(tenant.is_active)}</TableCell>
                  <TableCell>
                    {formatDate(tenant.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Can permission="tenant:read" role="super">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/tenants/${tenant.tenant_id}`);
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                        </Can>
                        <Can permission="tenant:update">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/tenants/${tenant.tenant_id}/edit`);
                            }}
                          >
                            Marketplace Settings
                          </DropdownMenuItem>
                        </Can>
                        <Can permission="tenant:update">
                          <DropdownMenuSeparator />
                          {tenant.is_active ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeactivateTenant(tenant.tenant_id);
                              }}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onActivateTenant(tenant.tenant_id);
                              }}
                            >
                              Activate
                            </DropdownMenuItem>
                          )}
                        </Can>
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
}
