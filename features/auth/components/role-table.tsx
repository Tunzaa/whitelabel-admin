"use client";

import { Role } from "../types/role";
import { MoreHorizontal, Edit, Trash, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/can";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface RoleTableProps {
  roles: Role[];
  onEditRole: (id: string) => void;
  onDeleteRole: (id: string) => void;
}

export function RoleTable({
  roles = [],
  onEditRole,
  onDeleteRole,
}: RoleTableProps) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Role Type</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No roles found.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.role}>
                  <TableCell className="font-medium">{role.role}</TableCell>
                  <TableCell>{role.description || "-"}</TableCell>
                  <TableCell>
                    {role.is_system_role ? (
                      <Badge variant="secondary">System</Badge>
                    ) : (
                      <Badge variant="default">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {Array.isArray(role.permissions) &&
                    role.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((p) => (
                          <Badge key={p} variant="secondary">
                            {p}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge variant="outline">
                            +{role.permissions.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        No permissions
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/auth/roles/${encodeURIComponent(role.role)}`,
                            )
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        <Can permission="roles:update">
                          <DropdownMenuItem
                            onClick={() => onEditRole(role.role)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </Can>
                        <Can permission="roles:delete">
                          {/* <DropdownMenuItem
                            onClick={() => onDeleteRole(role.role)}
                            className="text-red-600"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem> */}
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
