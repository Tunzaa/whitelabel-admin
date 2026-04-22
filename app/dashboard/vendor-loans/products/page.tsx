"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Pagination from "@/components/ui/pagination";

import { useLoanProductStore } from "@/features/loans/products/store";
import {
  LoanProductFilter,
  LoanProduct,
} from "@/features/loans/products/types";
import { ProductTable } from "@/features/loans/products/components/product-table";
import { useLoanProviderStore } from "@/features/loans/providers/store";

import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

function LoanProductsPage() {
  console.log('[Loan Products] Component rendering');
  const router = useRouter();
  const session = useSession();
  const tenantId = (session?.data?.user as { tenant_id?: string })?.tenant_id;
  const isFetchingRef = useRef(false);

  const { products, loading: productsLoading, storeError, fetchProducts, updateProductStatus, setStoreError } =
    useLoanProductStore();
  const { providers, fetchProviders, loading: providersLoading } = useLoanProviderStore();

  const loading = productsLoading || providersLoading;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const pageSize = 10;

  // Define tenant headers
  const tenantHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }
    return headers;
  }, [tenantId]);

  // Define filter based on active tab
  const getFilters = (): LoanProductFilter => {
    const baseFilter = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };

    // Add filter based on the active tab
    let finalFilter = baseFilter;
    switch (activeTab) {
      case "active":
        finalFilter = {
          ...baseFilter,
          is_active: true,
        };
        break;
      case "inactive":
        finalFilter = {
          ...baseFilter,
          is_active: false,
        };
        break;
      default:
        finalFilter = baseFilter;
    }

    console.log('[Loan Products] getFilters returning:', finalFilter, 'for tab:', activeTab);
    return finalFilter;
  };

  // Function to load products
  const loadProducts = async (showLoadingState = true) => {
    if (isFetchingRef.current) {
      console.log('[Loan Products] Already fetching, skipping duplicate call');
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoadingState) {
        setIsTabLoading(true);
      }
      setStoreError(null);
      const filters = getFilters();
      console.log('[Loan Products] Fetching with filters:', filters);
      // Clear previous products before making a new search
      if (searchTerm) {
        // We can't set products to null in the store, but we'll handle it in the API call
      }
      const result = await fetchProducts(
        {
          ...filters,
          search: searchTerm,
        },
        tenantHeaders,
      );
      console.log('[Loan Products] Fetch result:', result);
      // If result is empty and we have a search term, ensure products are handled
      if (searchTerm && (!result || result.items.length === 0)) {
        // Store handles empty results
      }
    } catch (error) {
      console.error('[Loan Products] Fetch error:', error);
      // Always set empty products array for 404 errors (no products found)
      if (
        error instanceof Error &&
        ((error.message.includes("404") &&
          error.message.includes("No products found")) ||
          error.message.includes("not found") ||
          error.message.includes("404"))
      ) {
        setStoreError(null);
      } else {
        // For other errors, set the error
        setStoreError(
          error instanceof Error ? error : new Error("Failed to load products"),
        );
      }
    } finally {
      isFetchingRef.current = false;
      if (showLoadingState) {
        setIsTabLoading(false);
      }
    }
  };

  // Effect for loading products on initial page load
  useEffect(() => {
    if (tenantId) {
      loadProducts();
      fetchProviders({}, tenantHeaders);
    }
  }, [tenantId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update searchTerm if searchQuery has at least 3 characters or is empty
      if (searchQuery.length >= 3 || searchQuery.length === 0) {
        setSearchTerm(searchQuery);
        setCurrentPage(1); // Reset to first page when search term changes
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Effect for filter changes
  useEffect(() => {
    if (tenantId) {
      loadProducts();
    }
  }, [tenantId, activeTab, currentPage, searchTerm]);

  // Log when products state changes to debug re-rendering
  useEffect(() => {
    console.log('[Loan Products] products state changed:', products);
  }, [products]);

  // Log when providers state changes to debug re-rendering
  useEffect(() => {
    console.log('[Loan Products] providers state changed:', providers);
  }, [providers]);

  // Filter products based on search query (client-side fallback)
  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products?.items || [];
    }
    return (products?.items || []).filter(
      (product) =>
        (product.name &&
          product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description &&
          product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products?.items, searchTerm]);

  // Map provider names to products
  const productsWithProviderNames = useMemo(() => {
    const providersArray = providers?.items || providers || [];
    const mapped = filteredProducts.map((product: any) => {
      const provider = providersArray.find((p: any) => p.provider_id === product.provider_id);
      return {
        ...product,
        provider_name: provider?.business_name || product.provider_name,
      };
    });
    console.log('[Loan Products] productsWithProviderNames mapped:', mapped);
    return mapped;
  }, [filteredProducts, providers]);

  console.log('[Loan Products] Current state:', {
    products,
    filteredProducts,
    productsWithProviderNames,
    providers,
    loading,
    isTabLoading,
    storeError,
  });

  const handleProductClick = (product: LoanProduct) => {
    router.push(`/dashboard/vendor-loans/products/${product.product_id}`);
  };

  const handleStatusChange = async (productId: string, isActive: boolean) => {
    try {
      await updateProductStatus(productId, isActive, tenantHeaders);
      toast.success("Product status updated successfully");
      await loadProducts();
    } catch {
      toast.error("Failed to update product status");
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    console.log('[Loan Products] Tab changing to:', value);
    setActiveTab(value);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  if (loading && !products?.items?.length && !isTabLoading) {
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

  if (storeError && !products?.items?.length && !isTabLoading) {
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
            buttonAction={() => loadProducts()}
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
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadProducts(false)}
                title="Refresh products"
                className="relative"
              >
                <RefreshCw />
              </Button>
              <Input
                type="search"
                placeholder="Search products..."
                className="w-[250px] pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full grid-cols-3">
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>

          {isTabLoading ? (
            <Spinner />
          ) : (
            <Card>
              <CardContent className="p-0">
                {(() => {
                  console.log('[Loan Products] Rendering ProductTable with products:', productsWithProviderNames);
                  return (
                    <ProductTable
                      products={productsWithProviderNames}
                      onView={handleProductClick}
                      onEdit={(product: LoanProduct) =>
                        router.push(
                          `/dashboard/vendor-loans/products/${product.product_id}/edit`,
                        )
                      }
                      onStatusChange={handleStatusChange}
                    />
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </Tabs>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={products?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
}

export default withAuthorization(LoanProductsPage, {
  permission: "vendor-loans:read",
});
