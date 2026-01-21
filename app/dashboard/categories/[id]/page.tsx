"use client";

import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Folder,
  Pencil,
  Power,
  PowerOff,
  Tag,
  Trash,
} from "lucide-react";
import { format } from "date-fns/format";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { useProductStore } from "@/features/products/store";
import { useCategoryStore } from "@/features/categories/store";
import { Category } from "@/features/categories/types";
import { Product } from "@/features/products/types";
import { ProductTable } from "@/features/products/components/product-table";

interface CategoryPageProps {
  params: {
    id: string;
  };
}

function CategoryPage({ params }: CategoryPageProps) {
  const { t } = useTranslation(['categories', 'common']);
  const router = useRouter();
  const { data: session } = useSession();
  const { id } = params;
  const [category, setCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryLoading, setCategoryLoading] = useState<boolean>(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"edit" | "delete" | null>(null);
  const { fetchCategory, deleteCategory, toggleCategoryStatus } = useCategoryStore();
  const { fetchProducts } = useProductStore();

  const tenantId = session?.user?.tenant_id;

  const tenantHeaders = {
    "X-Tenant-ID": tenantId,
  };

  useEffect(() => {
    if (!tenantId) return;

    const loadCategoryData = async () => {
      try {
        setCategoryLoading(true);
        const categoryData = await fetchCategory(id, tenantHeaders);
        setCategory(categoryData);

        if (categoryData.parent_id && categoryData.parent_id !== "none") {
          try {
            const parentData = await fetchCategory(categoryData.parent_id, tenantHeaders);
            setParentCategory(parentData);
          } catch (parentError) {
            console.error(t('page.error_fetching_parent'), parentError);
          }
        }
      } catch (err) {
        console.error(t('page.error_fetching'), err);
        setCategoryError(t('page.errorLoading'));
      } finally {
        setCategoryLoading(false);
      }
    };

    const loadProducts = async () => {
      try {
        setProductsLoading(true);
        const filter = { categoryId: id };
        const productsResponse = await fetchProducts(filter, tenantHeaders);
        setProducts(productsResponse.items || []);
      } catch (err) {
        console.error(t('products_card.error_fetching'), err);
        setProductsError(t('products_card.error_fetching', 'Could not load products.'));
      } finally {
        setProductsLoading(false);
      }
    };

    loadCategoryData();
    loadProducts();
  }, [id, tenantId, fetchCategory, fetchProducts, t]);

  const getStatusBadge = (status: boolean | undefined) => {
    switch (status) {
      case true:
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{t('common:status.active')}</Badge>;
      case false:
        return <Badge variant="destructive">{t('common:status.inactive')}</Badge>;
      default:
        return <Badge variant="outline">{t('common:status.unknown', 'Unknown')}</Badge>;
    }
  };

  const handleDelete = async () => {
    if (!category || !tenantId) return;
    try {
      await deleteCategory(id, tenantHeaders);
      toast.success(t('notifications.deleted_successfully', { name: category.name }));
      router.push("/dashboard/categories");
    } catch (error) {
      toast.error(t('notifications.failed_to_delete'));
      setActiveAction(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!category || !tenantId) return;
    try {
      const newStatus = !category.is_active;
      await toggleCategoryStatus(id, newStatus, tenantHeaders);
      toast.success(t(newStatus ? 'notifications.activated_successfully' : 'notifications.deactivated_successfully'));
      const updatedCategory = await fetchCategory(id, tenantHeaders);
      setCategory(updatedCategory);
    } catch (error) {
      toast.error(t(category.is_active ? 'notifications.failed_to_deactivate' : 'notifications.failed_to_activate'));
    }
  };

  if (categoryLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner /></div>;
  }

  if (categoryError || !category) {
    return (
      <ErrorCard
        title={t('page.errorLoading')}
        error={{ message: categoryError || t('page.categoryNotFound') }}
        buttonText={t('common:actions.back_to_list')}
        buttonAction={() => router.push("/dashboard/categories")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {activeAction === "delete" && (
        <Dialog open onOpenChange={() => setActiveAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('delete_dialog.title')}</DialogTitle>
              <DialogDescription dangerouslySetInnerHTML={{ __html: t('delete_dialog.description', { name: category.name }) }} />
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setActiveAction(null)}>{t('common:actions.cancel')}</Button>
              <Button variant="destructive" onClick={handleDelete}>{t('common:actions.delete')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex items-center p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/categories")}
          className="mr-4"
          title={t('common:actions.back')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">{t('common:actions.back')}</span>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('page.category_id', 'Category ID')}: {category.category_id}
          </p>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          {getStatusBadge(category.is_active)}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('details_card.title')}</CardTitle>
              <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/categories/${id}/edit`)} title={t('common:actions.edit')}>
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center mb-6">
                <div className="h-16 w-16 mr-6 flex items-center justify-center rounded-md bg-primary/10">
                  <Folder className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('details_card.created_at')}:{" "}
                    {category.created_at ? format(new Date(category.created_at), "PPP") : t('common:na')}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">{t('common:status.title')}</p>
                  <div className="mt-1">{getStatusBadge(category.is_active)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium">{t('details_card.parent_category')}</p>
                  <p className="text-sm">
                    {parentCategory ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm font-normal"
                        onClick={() => router.push(`/dashboard/categories/${parentCategory.category_id}`)}
                      >
                        <Tag className="mr-1 h-3 w-3" /> {parentCategory.name}
                      </Button>
                    ) : (
                      t('common:none')
                    )}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium mb-2">{t('common:form.description')}</p>
                <p className="text-sm whitespace-pre-wrap">
                  {category.description || t('details_card.no_description')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('products_card.title')}</CardTitle>
              <CardDescription>
                {t('products_card.description', { count: products.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Spinner />
                </div>
              ) : productsError ? (
                <div className="text-center py-8 text-destructive">
                  <p>{productsError}</p>
                </div>
              ) : products.length > 0 ? (
                <ProductTable
                  products={products}
                  onEdit={(product) => router.push(`/dashboard/products/${product.product_id}`)}
                  onDelete={() => { }} // Add delete functionality if needed
                  onToggleStatus={() => { }} // Add toggle status functionality if needed
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('products_card.no_products')}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/dashboard/products/add")}
                  >
                    {t('products_card.add_product')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('status_card.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('common:status.title')}</p>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(category.is_active)}
                  <Button variant="outline" size="sm" onClick={handleToggleStatus}>
                    {category.is_active ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                    {t(category.is_active ? 'common:actions.deactivate' : 'common:actions.activate')}
                  </Button>
                </div>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium">{t('status_card.last_updated')}</p>
                <p className="text-sm text-muted-foreground">
                  {category.updated_at ? format(new Date(category.updated_at), "PPP p") : t('common:na')}
                </p>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium">{t('status_card.products_count')}</p>
                <p className="text-sm text-muted-foreground">{products.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('actions_card.title', 'Actions')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Can permission="category:update">
                <Button variant="outline" onClick={() => router.push(`/dashboard/categories/${category.category_id}/edit`)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('common:actions.edit_entity', { entity: t('common:entity.category') })}
                </Button>
              </Can>
              <Can permission="category:delete">
                <Button variant="destructive" onClick={() => setActiveAction("delete")}>
                  <Trash className="h-4 w-4 mr-2" />
                  {t('common:actions.delete_entity', { entity: t('common:entity.category') })}
                </Button>
              </Can>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withAuthorization(CategoryPage, { permission: "category:read" });
