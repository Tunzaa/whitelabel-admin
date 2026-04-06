"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Search, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useLoanProductStore } from "@/features/loans/products/store";
import {
  LoanProductFilter,
  LoanProduct,
} from "@/features/loans/products/types";
import { ProductTable } from "@/features/loans/products/components/product-table";

import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

function LoanProductsPage() {
  const router = useRouter();
  const session = useSession();
  const tenantId = (session?.data?.user as { tenant_id?: string })?.tenant_id;

  const { products, loading, storeError, fetchProducts, updateProductStatus } =
    useLoanProductStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const pageSize = 10;

  // Define tenant headers
  const tenantHeaders = {
    "X-Tenant-ID": tenantId || "",
  };

  // Define filter based on active tab
  const getFilters = (): LoanProductFilter => {
    const baseFilter: LoanProductFilter = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };

    // Add search filter if available
    if (searchQuery) {
      baseFilter.search = searchQuery;
    }

    // Add filter based on the active tab
    switch (activeTab) {
      case "active":
        return {
          ...baseFilter,
          is_active: true,
        };
      case "inactive":
        return {
          ...baseFilter,
          is_active: false,
        };
      default:
        return baseFilter;
    }
  };

  // Fetch products when tab changes or page changes
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setIsTabLoading(true);
        const filters = getFilters();
        await fetchProducts(filters, tenantHeaders);
      } catch {
      } finally {
        setIsTabLoading(false);
      }
    };

    if (tenantId) {
      fetchProductData();
    }
  }, [fetchProducts, activeTab, currentPage, searchQuery, tenantId]);

  const handleProductClick = (product: LoanProduct) => {
    router.push(`/dashboard/vendor-loans/products/${product.product_id}`);
  };

  const handleStatusChange = async (productId: string, isActive: boolean) => {
    try {
      await updateProductStatus(productId, isActive, tenantHeaders);

      // Refresh the product list after status change
      const filters = getFilters();
      fetchProducts(filters, tenantHeaders);
    } catch {
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Products</h1>
            <p className="text-muted-foreground">
              Manage loan products offered to vendors
            </p>
          </div>
          <Can permission="vendor-loans:create">
            <Button
              onClick={() =>
                router.push("/dashboard/vendor-loans/products/add")
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Can>
        </div>

        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!products && !loading && storeError) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Products</h1>
            <p className="text-muted-foreground">
              Manage loan products offered to vendors
            </p>
          </div>
          <Can permission="vendor-loans:create">
            <Button
              onClick={() =>
                router.push("/dashboard/vendor-loans/products/add")
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Can>
        </div>

        <div>
          <ErrorCard
            title="Failed to load loan products"
            error={{
              status: storeError.status?.toString() || "Error",
              message: storeError.message || "An error occurred",
            }}
            buttonText="Retry"
            buttonAction={() => fetchProducts(getFilters(), tenantHeaders)}
            buttonIcon={RefreshCw}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Products</h1>
          <p className="text-muted-foreground">
            Manage loan products offered to vendors
          </p>
        </div>
        <Can permission="vendor-loans:create">
          <Button
            onClick={() => router.push("/dashboard/vendor-loans/products/add")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Can>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between mb-4">
          <div className="flex-1 max-sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8"
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <ProductTable
                products={products}
                onView={handleProductClick}
                onEdit={(product: LoanProduct) =>
                  router.push(
                    `/dashboard/vendor-loans/products/${product.product_id}/edit`,
                  )
                }
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <ProductTable
                products={products}
                onView={handleProductClick}
                onEdit={(product: LoanProduct) =>
                  router.push(
                    `/dashboard/vendor-loans/products/${product.product_id}/edit`,
                  )
                }
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
          <TabsContent value="inactive" className="mt-4">
            {isTabLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <ProductTable
                products={products}
                onView={handleProductClick}
                onEdit={(product: LoanProduct) =>
                  router.push(
                    `/dashboard/vendor-loans/products/${product.product_id}/edit`,
                  )
                }
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default withAuthorization(LoanProductsPage, {
  permission: "vendor-loans:read",
});
