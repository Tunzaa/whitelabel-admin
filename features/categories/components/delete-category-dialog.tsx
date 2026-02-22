"use client";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useCategoryStore } from "@/features/categories/store";
import { Category } from "@/features/categories/types";

interface DeleteCategoryDialogProps {
  category: Category;
  tenantId: string | undefined;
  onClose: () => void;
}

export function DeleteCategoryDialog({ category, tenantId, onClose }: DeleteCategoryDialogProps) {
  const { t } = useTranslation(['categories', 'common']);
  const { deleteCategory, fetchCategories } = useCategoryStore();

  const handleDelete = async () => {
    if (!tenantId) {
      toast.error(t('common:messages.tenant_id_missing_for_delete'));
      return;
    }

    const tenantHeaders = { "X-Tenant-ID": tenantId };

    try {
      await deleteCategory(category.category_id, tenantHeaders);
      toast.success(t('notifications.deleted_successfully', { name: category.name }));
      fetchCategories({}, tenantHeaders); // Refetch categories
      onClose();
    } catch (error) {
      toast.error(t('notifications.failed_to_delete', { name: category.name }));
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete_dialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete_dialog.description', { name: category.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>{t('common:actions.delete')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
