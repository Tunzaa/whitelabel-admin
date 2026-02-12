"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { ProductForm } from "@/features/products/components/product-form";
import { useProductStore } from "@/features/products/store";
import { ProductFormValues } from "@/features/products/schema";
import { withAuthorization } from "@/components/auth/with-authorization";

function AddProductPage() {
  const router = useRouter();
  const { createProduct } = useProductStore();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ProductFormValues) => {
    try {
      setIsSubmitting(true);

      // Ensure tenant ID is included
      const tenantId = (session?.user as any)?.tenant_id;
      if (!tenantId) {
        throw new Error("Missing tenant ID");
      }

      // Add headers for the API request
      const headers = { "X-Tenant-ID": tenantId };

      // Create the product
      await createProduct(data, headers);
      toast.success("Product created successfully");
      router.push("/dashboard/products");
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create product",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/products");
  };

  return (
    <div className="h-full">
      <ProductForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        title="Create New Product"
        description="Add a new product to your marketplace"
      />
    </div>
  );
}

export default withAuthorization(AddProductPage, {
  permission: "products:create",
});
