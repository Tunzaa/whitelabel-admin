"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { useCategoryStore } from '@/features/categories/store';
import { CategoryForm } from '@/features/categories/components/category-form';
import { CategoryFormValues } from '@/features/categories/schema';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { withAuthorization } from '@/components/auth/with-authorization';

const EditCategoryPage = () => {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const { t } = useTranslation(['categories', 'common']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryId = params.id as string;

  const {
    updateCategory,
    fetchCategory,
    fetchCategories,
    categories,
    category: currentCategory,
    loading,
    error,
  } = useCategoryStore();

  const tenantId = useMemo(() => (session?.user as any)?.tenant_id, [session]);
  const tenantHeader = useMemo(() => ({ 'X-Tenant-ID': tenantId }), [tenantId]);

  useEffect(() => {
    if (tenantId && categoryId) {
      fetchCategory(categoryId, tenantHeader);
      fetchCategories(undefined, tenantHeader);
    }
  }, [tenantId, categoryId, fetchCategory, fetchCategories, tenantHeader]);

  const handleUpdateCategory = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    if (!tenantId) {
      toast.error(t('common:messages.tenant_id_missing'));
      return;
    }

    try {
      await updateCategory(categoryId, data, tenantHeader);
      toast.success(t('notifications.updated_successfully'));
      router.push(`/dashboard/categories/${categoryId}`);
    } catch (error) {
      console.error(t('notifications.failed_to_update'), error);
      toast.error(t('notifications.failed_to_update'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading && !currentCategory) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error && !currentCategory) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('common:messages.error_fetching_title', 'Error')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!currentCategory) {
    return null; // Or a 'Not Found' component, e.g., <NotFound message={t('page.categoryNotFound')} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/categories/${currentCategory.category_id}`)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{t('common:actions.back', 'Back')}</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('page.edit_title', { name: currentCategory?.name })}
            </h1>
            <p className="text-muted-foreground">
              {t('page.edit_description', 'Update category information and settings')}
            </p>
          </div>
        </div>
        <Button
          type="submit"
          form="edit-category-form"
          disabled={isSubmitting || loading}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" color="white" />
              {t('common:actions.updating', 'Updating...')}
            </>
          ) : (
            t('common:actions.save_changes', 'Save Changes')
          )}
        </Button>
      </div>
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('form.edit_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm
              formId="edit-category-form"
              initialData={currentCategory}
              onFormSubmit={handleUpdateCategory}
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

export default withAuthorization(EditCategoryPage, { permission: "category:update" });