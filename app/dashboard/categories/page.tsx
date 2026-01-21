"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useTranslation } from 'react-i18next';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import Pagination from "@/components/ui/pagination";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useCategoryStore } from "@/features/categories/store";
import { CategoryFilter } from "@/features/categories/types";
import { CategoryTable } from "@/features/categories/components/category-table";
import { DeleteCategoryDialog } from "@/features/categories/components/delete-category-dialog";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

import { Category } from "@/features/categories/types";

function CategoriesPage() {
  const { t } = useTranslation(['categories', 'common']);
  const router = useRouter();
  const session = useSession();
  const tenantId: string | undefined = (session.data?.user as any)?.tenant_id;

  const {
    categories,
    total,
    loading,
    storeError,
    fetchCategories,
    toggleCategoryStatus,
    activeAction,
    setActiveAction,
    setCategory,
    category
  } = useCategoryStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  const [isTabLoading, setIsTabLoading] = useState(false);
  const pageSize = 10;

  const tenantHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }
    return headers;
  }, [tenantId]);

  const getFilters = (): CategoryFilter => {
    const baseFilter: CategoryFilter = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };

    if (searchQuery) {
      baseFilter.search = searchQuery;
    }

    switch (activeTab) {
      case "active":
        return { ...baseFilter, is_active: true };
      case "inactive":
        return { ...baseFilter, is_active: false };
      default:
        return baseFilter;
    }
  };

  useEffect(() => {
    const fetchCategoriesData = async () => {
      if (!tenantId) return;
      try {
        setIsTabLoading(true);
        const filters = getFilters();
        await fetchCategories(filters, tenantHeaders);
      } catch (error) {
        console.error(t('page.error.loading'), error);
      } finally {
        setIsTabLoading(false);
      }
    };

    fetchCategoriesData();
  }, [fetchCategories, activeTab, currentPage, searchQuery, tenantId]);

  const handleAddCategory = () => {
    router.push("/dashboard/categories/add");
  };

  const handleEditCategory = (category: Category) => {
    router.push(`/dashboard/categories/${category.category_id}/edit`);
  };

  const handleViewDetails = (category: Category) => {
    router.push(`/dashboard/categories/${category.category_id}`);
  };

  const handleDeleteCategory = (category: Category) => {
    setCategory(category);
    setActiveAction("delete");
  };

  const handleToggleStatus = async (category: Category, isActive: boolean) => {
    await toggleCategoryStatus(category.category_id, isActive, tenantHeaders);
    const filters = getFilters();
    fetchCategories(filters, tenantHeaders);
  };

  const onDialogClose = () => {
    setActiveAction(null);
    setCategory(null);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
          <Can permission="category:create">
            <Button onClick={handleAddCategory}>
              <Plus className="mr-2 h-4 w-4" />
              {t('add_category')}
            </Button>
          </Can>
        </div>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  if (storeError && !loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
          <Can permission="category:create">
            <Button onClick={handleAddCategory}>
              <Plus className="mr-2 h-4 w-4" />
              {t('add_category')}
            </Button>
          </Can>
        </div>
        <div>
          <ErrorCard
            title={t('page.errorLoading')}
            error={{
              status: storeError.status?.toString() || t('common:messages.error'),
              message: storeError.message || t('common:messages.an_error_occurred'),
            }}
            buttonText={t('page.retry')}
            buttonAction={() => fetchCategories(getFilters(), tenantHeaders)}
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
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Can permission="category:create">
          <Button onClick={handleAddCategory}>
            <Plus className="mr-2 h-4 w-4" />
            {t('add_category')}
          </Button>
        </Can>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between mb-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('search_placeholder')}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
            <TabsTrigger value="active">{t('tabs.active')}</TabsTrigger>
            <TabsTrigger value="inactive">{t('tabs.inactive')}</TabsTrigger>
          </TabsList>

          {isTabLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner />
            </div>
          ) : (
            <div>
              <CategoryTable
                categories={categories}
                onEdit={handleEditCategory}
                onViewDetails={handleViewDetails}
                onDelete={handleDeleteCategory}
                onToggleStatus={handleToggleStatus}
              />
              <Pagination
                currentPage={currentPage}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Tabs>
      </div>

      {activeAction === "delete" && category && (
        <DeleteCategoryDialog category={category} tenantId={tenantId} onClose={onDialogClose} />
      )}

    </div>
  );
}

export default withAuthorization(CategoriesPage, { permission: "category:read" });
