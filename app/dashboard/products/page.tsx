"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Search, RefreshCw, Files } from "lucide-react";
import { toast } from "sonner";

import { useProductStore } from "@/features/products/store";
import { Product, ProductFilter } from "@/features/products/types";
import { useVendorStore } from "@/features/vendors/store";
import { ProductTable } from "@/features/products/components/product-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import Pagination from "@/components/ui/pagination";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductRejectionDialog } from "@/features/products/components/product-rejection-dialog";
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
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

function ProductsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenant_id;

  const {
    products: productData,
    loading,
    storeError: error,
    fetchProducts,
    updateProductStatus,
    deleteProduct,
  } = useProductStore();

  const { vendors, loading: vendorsLoading, fetchVendors } = useVendorStore();

  console.log("DEBUG: Data from product store:", {
    productData,
    loading,
    error,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToReject, setProductToReject] = useState<Product | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const pageSize = 10;

  const tenantHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }
    return headers;
  }, [tenantId]);

  const getFilters = (): ProductFilter => {
    const baseFilter: ProductFilter = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };

    // Add vendor filter if selected (and not "all")
    if (selectedVendorId && selectedVendorId !== "all") {
      baseFilter.vendorId = selectedVendorId;
    }

    switch (activeTab) {
      case "published":
        return {
          ...baseFilter,
          verification_status: "approved",
          is_active: true,
        };
      case "draft":
        return {
          ...baseFilter,
          verification_status: "approved",
          is_active: false,
        };
      case "pending":
        return { ...baseFilter, verification_status: "pending" };
      case "rejected":
        return { ...baseFilter, verification_status: "rejected" };
      default:
        return baseFilter;
    }
  };

  useEffect(() => {
    const fetchProductsData = async () => {
      if (!tenantId) return;
      setIsTabLoading(true);
      try {
        const filters = getFilters();
        const response = await fetchProducts(filters, tenantHeaders);
        if (response && typeof response.total === "number") {
          setTotalProducts(response.total);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setIsTabLoading(false);
      }
    };
    fetchProductsData();
  }, [fetchProducts, activeTab, currentPage, selectedVendorId, tenantId]);

  // Fetch vendors on component mount
  useEffect(() => {
    if (tenantId) {
      fetchVendors({}, tenantHeaders);
    }
  }, [fetchVendors, tenantId]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) {
      return productData || [];
    }
    return (productData || []).filter(
      (product) =>
        (product.name &&
          product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.sku &&
          product.sku.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [productData, searchQuery]);

  const handleProductClick = (product: Product) => {
    router.push(`/dashboard/products/${product.product_id}`);
  };

  const handleUpdateProduct = async (
    productId: string,
    data: Partial<Product>,
  ) => {
    try {
      await updateProductStatus(productId, data, tenantHeaders);
      toast.success("Product status updated successfully.");
      const filters = getFilters();
      fetchProducts(filters, tenantHeaders);
    } catch (err) {
      toast.error("Failed to update product.");
      console.error("Update error:", err);
    }
  };

  const handleRejectOrSuspend = async (
    productId: string,
    reason: string,
    customReason?: string,
  ) => {
    const reasonText = customReason || reason;
    await handleUpdateProduct(productId, {
      status: "rejected",
      rejection_reason: reasonText,
    });
    setProductToReject(null);
  };

  const handleDeleteRequest = (product: Product) => {
    setProductToDelete(product);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.product_id, tenantHeaders);
      toast.success(`Product "${productToDelete.name}" deleted successfully.`);
      setProductToDelete(null);
      const filters = getFilters();
      fetchProducts(filters, tenantHeaders);
    } catch (err) {
      toast.error("Failed to delete product.");
      console.error("Delete error:", err);
      setProductToDelete(null);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setCurrentPage(1);
  };

  if (loading && !productData?.length) {
    return <Spinner />;
  }

  if (error && !productData?.length) {
    return (
      <div className="p-4">
        <ErrorCard
          title="Failed to load products"
          error={{
            status: error.status?.toString() || "Error",
            message: error.message || "An unexpected error occurred.",
          }}
          buttonText="Retry"
          buttonAction={() => fetchProducts(getFilters(), tenantHeaders)}
          buttonIcon={RefreshCw}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your products and their approval status.
          </p>
        </div>
        <div className="flex">
          <Can permission="products:create">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/products/add")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Can>
          <Can permission="products:create">
            <Button
              onClick={() => router.push("/dashboard/products/bulk-upload")}
              className="ml-2"
            >
              <Files className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
          </Can>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between mb-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedVendorId} onValueChange={handleVendorChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {(vendors?.items || vendors || [])?.map((vendor) => (
                  <SelectItem key={vendor.vendor_id} value={vendor.vendor_id}>
                    {vendor.business_name || vendor.vendor_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          {isTabLoading ? (
            <Spinner />
          ) : (
            <>
              <ProductTable
                products={filteredProducts}
                onProductClick={handleProductClick}
                onUpdateProduct={handleUpdateProduct}
                onDelete={handleDeleteRequest}
                onReject={setProductToReject}
              />
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalProducts}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </>
          )}
        </Tabs>
      </div>

      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product "{productToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductRejectionDialog
        product={productToReject}
        isOpen={!!productToReject}
        onClose={() => setProductToReject(null)}
        onConfirm={handleRejectOrSuspend}
        loading={loading}
      />
    </div>
  );
}

export default withAuthorization(ProductsPage, { permission: "products:read" });
