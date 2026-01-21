"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Eye,
  Edit,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Can } from "@/components/auth/can";

import { Product } from "../types";

interface ProductTableProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onUpdateProduct: (
    productId: string,
    data: Partial<Product>
  ) => Promise<void>;
  onDelete: (product: Product) => void;
  onReject: (product: Product) => void;
}

export function ProductTable({
  products,
  onProductClick,
  onUpdateProduct,
  onDelete,
  onReject,
}: ProductTableProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (productId: string) => {
    setProcessingId(productId);
    try {
      await onUpdateProduct(productId, { status: "approved" });
    } catch (error) {
      // Error is handled in the parent component's toast
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleIsActive = (product: Product) => {
    setProcessingId(product.product_id);
    try {
      onUpdateProduct(product.product_id, { is_active: !product.is_active });
    } catch (error) {
      // Error is handled in the parent component's toast
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (product: Product) => {
    setProcessingId(product.product_id);
    try {
      onReject(product);
    } catch (error) {
      // Error is handled in the parent component's toast
    } finally {
      setProcessingId(null);
    }
  };

  const getApprovalStatusBadge = (status: Product["verification_status"]) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "suspended":
        return <Badge variant="warning">Suspended</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean | undefined) => {
    return isActive ? (
      <Badge variant="default">Published</Badge>
    ) : (
      <Badge variant="secondary">Draft</Badge>
    );
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd MMM, yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Approval Status</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product) => (
                <TableRow
                  key={product.product_id}
                  className="hover:bg-muted/50"
                >
                  <TableCell
                    className="font-medium cursor-pointer"
                    onClick={() => onProductClick(product)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-md">
                        <AvatarImage
                          src={product.images?.[0]?.url || ""}
                          alt={product.name}
                        />
                        <AvatarFallback className="rounded-md">
                          {product.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {product.sku || "N/A"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => onProductClick(product)}>
                    <div className="flex flex-wrap gap-1">
                      {product.categories?.slice(0, 2).map((cat) => (
                        <Badge key={cat.category_id} variant="secondary">
                          {cat.name}
                        </Badge>
                      ))}
                      {product.categories && product.categories.length > 2 && (
                        <Badge variant="outline">
                          +{product.categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => onProductClick(product)}>
                    {getApprovalStatusBadge(product.verification_status)}
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => onProductClick(product)}>
                    {getStatusBadge(product.is_active)}
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => onProductClick(product)}>
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {`Tsh ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.sale_price ?? 0)}`}
                      </div>
                      {product.base_price && product.base_price > (product.sale_price ?? 0) && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">
                            {`Tsh ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.base_price)}`}
                          </span>
                          <Badge variant="destructive" className="text-xs px-1 py-0">
                            {(((product.base_price - (product.sale_price ?? 0)) / product.base_price) * 100).toFixed(1)}% OFF
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => onProductClick(product)}>{formatDate(product.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          disabled={processingId === product.product_id}
                          className={processingId === product.product_id ? 'opacity-50' : ''}
                        >
                          <div className="relative">
                            {processingId === product.product_id && (
                              <div className="absolute -left-6">
                                <Spinner size="sm" />
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              disabled={processingId === product.product_id}
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/products/${product.product_id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <Can permission="product:update">
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/products/${product.product_id}/edit`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Product
                            </DropdownMenuItem>
                          </Can>
                          <DropdownMenuSeparator />
                          {product.verification_status === "pending" && (
                            <>
                              <Can permission="product:update">
                                <DropdownMenuItem
                                  onClick={() => handleApprove(product.product_id)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Approve
                                </DropdownMenuItem>
                              </Can>
                              <Can permission="product:update">
                                <DropdownMenuItem
                                  onClick={() => handleReject(product)}
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  Reject
                                </DropdownMenuItem>
                              </Can>
                            </>
                          )}
                          {product.verification_status === "approved" && (
                            <>
                              <Can permission="product:update">
                                <DropdownMenuItem
                                  onClick={() => handleToggleIsActive(product)}
                                >
                                  {product.is_active ? (
                                    <>
                                      <ToggleLeft className="mr-2 h-4 w-4" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="mr-2 h-4 w-4" />
                                      Publish
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </Can>
                              <Can permission="product:update">
                                <DropdownMenuItem
                                  onClick={() => handleReject(product)}
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-yellow-500" />
                                  Suspend
                                </DropdownMenuItem>
                              </Can>
                            </>
                          )}
                          {product.verification_status === "rejected" && (
                            <Can permission="product:update">
                              <DropdownMenuItem
                                onClick={() => handleApprove(product.product_id)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                Approve
                              </DropdownMenuItem>
                            </Can>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No products found for the selected filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}