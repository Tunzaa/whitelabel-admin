"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";

import { useProductStore } from "@/features/products/store";
import { Product } from "@/features/products/types";
import { ProductForm } from "@/features/products/components/product-form";
import { ProductFormValues } from "@/features/products/schema";
import { withAuthorization } from "@/components/auth/with-authorization";

function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { fetchProduct, updateProduct } = useProductStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get tenant ID from session
  const tenantId = (session?.user as any)?.tenant_id || "";

  useEffect(() => {
    const loadProduct = async () => {
      if (!tenantId) return;

      try {
        setLoading(true);
        setError(null);
        const productId = params.id as string;
        const headers = { "X-Tenant-ID": tenantId };
        const productData = await fetchProduct(productId, headers);
        setProduct(productData);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      loadProduct();
    }
  }, [params.id, tenantId, fetchProduct]);

  const handleSubmit = async (data: ProductFormValues) => {
    if (!product) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Ensure tenant ID is included
      if (!tenantId) {
        throw new Error("Missing tenant ID");
      }

      // Add headers for the API request
      const headers = { "X-Tenant-ID": tenantId };
      data.tenant_id = tenantId;

      // Update the product - using the product_id from the loaded product
      await updateProduct(product.product_id, data, headers);
      toast.success("Product updated successfully");
      router.push(`/dashboard/products/${product.product_id}`);
    } catch (err) {
      console.error("Error updating product:", err);
      setError(err instanceof Error ? err.message : "Failed to update product");
      toast.error("Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/products");
  };

  if (loading) {
    return (
      <Spinner />
    );
  }

  if (error && !product) {
    return (
      <ErrorCard
        title="Error Loading Product"
        error={{
          status: "error",
          message: error || "Product not found",
        }}
        buttonText="Back to Products"
        buttonAction={() => router.push("/dashboard/products")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  return (
    <div className="h-full">
      <ProductForm
        initialData={product}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        title={`Edit Product: ${product.name}`}
        description="Update your product information"
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default withAuthorization(EditProductPage, { permission: "products:update" });
