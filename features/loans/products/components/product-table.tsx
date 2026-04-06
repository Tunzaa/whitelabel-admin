import React from "react";
import { useRouter } from "next/navigation";
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
import { MoreHorizontal, Edit, Eye, CheckCircle, XCircle } from "lucide-react";
import { LoanProduct } from "../types";
import { compactCurrency } from "@/lib/utils";
import { Can } from "@/components/auth/can";

interface ProductTableProps {
  products: LoanProduct[];
  onView: (product: LoanProduct) => void;
  onEdit: (product: LoanProduct) => void;
  onProviderClick?: (providerId: string) => void;
  onStatusChange?: (productId: string, isActive: boolean) => void;
}

export function ProductTable({
  products,
  onView,
  onEdit,
  onProviderClick,
  onStatusChange,
}: ProductTableProps) {
  const router = useRouter();
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] =
    React.useState<LoanProduct | null>(null);
  const [statusAction, setStatusAction] = React.useState<
    "activate" | "deactivate" | null
  >(null);

  const handleStatusAction = (
    product: LoanProduct,
    action: "activate" | "deactivate",
  ) => {
    setSelectedProduct(product);
    setStatusAction(action);
    setConfirmDialogOpen(true);
  };

  const confirmStatusChange = () => {
    if (selectedProduct && statusAction && onStatusChange) {
      onStatusChange(selectedProduct.product_id, statusAction === "activate");
    }
    setConfirmDialogOpen(false);
  };

  const handleRowClick = (product: LoanProduct) => {
    if (onView) {
      onView(product);
    }
  };

  const renderPaymentFrequency = (frequency: string) => {
    if (!frequency) return "N/A";
    const normalized = frequency.toLowerCase();
    switch (normalized) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "bi_weekly":
      case "bi-weekly":
        return "Bi-Weekly";
      case "monthly":
        return "Monthly";
      default:
        return frequency;
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Interest Rate</TableHead>
              <TableHead>Amount Range</TableHead>
              <TableHead>Payment Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-6 text-muted-foreground"
                >
                  No loan products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.product_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(product)}
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span 
                      className="text-primary hover:underline font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onProviderClick) {
                          onProviderClick(product.provider_id);
                        } else {
                          router.push(`/dashboard/vendor-loans/providers/${product.provider_id}`);
                        }
                      }}
                    >
                      {product.provider_name || "Unknown Provider"}
                    </span>
                  </TableCell>
                  <TableCell>{product.interest_rate}%</TableCell>
                  <TableCell>
                    {product.min_amount !== undefined ? compactCurrency(product.min_amount) : "0"} -{" "}
                    {product.max_amount !== undefined ? compactCurrency(product.max_amount) : "N/A"}
                  </TableCell>
                  <TableCell>
                    {renderPaymentFrequency(product.repayment_frequency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={(product.is_active || product.status === 'ACTIVE') ? "success" : "secondary"}
                      className={
                        (product.is_active || product.status === 'ACTIVE')
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : ""
                      }
                    >
                      {(product.is_active || product.status === 'ACTIVE') ? "Active" : (product.status || "Inactive")}
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
                              onView(product);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <Can permission="vendor-loans:update">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(product);
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
                            {(product.is_active || product.status === 'ACTIVE') ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusAction(product, "deactivate");
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusAction(product, "activate");
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
                ? "Activate Product"
                : "Deactivate Product"}
            </DialogTitle>
            <DialogDescription>
              {statusAction === "activate"
                ? "Are you sure you want to activate this loan product? This will make it available to vendors."
                : "Are you sure you want to deactivate this loan product? This will make it unavailable to vendors."}
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
