"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useCategoryStore } from "@/features/categories/store";
import { CategoryForm } from "@/features/categories/components/category-form";
import { CategoryFormValues } from "@/features/categories/schema";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { withAuthorization } from "@/components/auth/with-authorization";

const AddCategoryPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslation(["categories", "common"]);

  const {
    createCategory,
    fetchCategories,
    categories,
    loading: isSubmitting,
  } = useCategoryStore();

  const tenantId = useMemo(() => (session?.user as any)?.tenant_id, [session]);

  useEffect(() => {
    if (tenantId) {
      fetchCategories(undefined, { "X-Tenant-ID": tenantId });
    }
  }, [tenantId, fetchCategories]);

  const handleCreateCategory = async (data: CategoryFormValues) => {
    if (!tenantId) {
      toast.error(t("common:messages.tenant_id_missing"));
      return;
    }

    const categoryData = { ...data, tenant_id: tenantId };

    try {
      await createCategory(categoryData, { "X-Tenant-ID": tenantId });
      toast.success(t("notifications.created_successfully"));
      router.push("/dashboard/categories");
    } catch (error) {
      console.error(t("notifications.failed_to_create"), error);
      toast.error(t("notifications.failed_to_create"));
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/categories`)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{t("common:actions.back")}</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("page.add_title")}
            </h1>
            <p className="text-muted-foreground">{t("page.add_description")}</p>
          </div>
        </div>
        <Button type="submit" form="add-category-form" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" color="white" />
              {t("common:actions.creating", "Creating...")}
            </>
          ) : (
            t("common:actions.create", "Create")
          )}
        </Button>
      </div>
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("form.add_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm
              formId="add-category-form"
              onFormSubmit={handleCreateCategory}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              parentCategories={categories}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default withAuthorization(AddCategoryPage, {
  permission: "categories:create",
});
