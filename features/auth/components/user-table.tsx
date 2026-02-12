"use client";

import { useState } from "react";
import { User } from "../types/user";
import {
  MoreHorizontal,
  Edit,
  Eye,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Can } from "@/components/auth/can";

interface UserTableProps {
  users: User[];
  onUserClick: (user: User) => void;
  onActivateUser: (id: string) => void;
  onDeactivateUser: (id: string) => void;
  onEditUser: (id: string) => void;
}

const getInitials = (name: string) => {
  if (!name) return "";
  const names = name.split(" ");
  const initials = names.map((n) => n[0]).join("");
  return initials.toUpperCase();
};

export function UserTable({
  users,
  onUserClick,
  onActivateUser,
  onDeactivateUser,
  onEditUser,
}: UserTableProps) {
  const getStatusBadge = (isActive?: boolean) => {
    if (isActive === true) {
      return <Badge variant="default">Active</Badge>;
    } else if (isActive === false) {
      return <Badge variant="destructive">Inactive</Badge>;
    } else {
      return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getVerifiedBadge = (isVerified?: boolean) => {
    if (isVerified) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">Verified</Badge>
      );
    } else {
      return <Badge variant="secondary">Not Verified</Badge>;
    }
  };

  return (
    <Card className="mx-4">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.user_id}
                  onClick={() => onUserClick(user)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {getInitials(
                            user.name || `${user.first_name} ${user.last_name}`,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.name || `${user.first_name} ${user.last_name}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          User_ID: {user.user_id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.is_active)}</TableCell>
                  <TableCell>{getVerifiedBadge(user.is_verified)}</TableCell>
                  <TableCell>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
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
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onUserClick(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <Can permission="users:update">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditUser(user.user_id);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {/* {user.is_active ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeactivateUser(user.user_id);
                              }}
                            >
                              <ShieldOff className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onActivateUser(user.user_id);
                              }}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )} */}
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
