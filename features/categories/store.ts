import { create } from 'zustand';
import { ApiResponse } from '@/features/vendors/types';
import { apiClient } from '@/lib/api/client';
import { Category, CategoryFilter, CategoryListResponse, CategoryAction, CategoryError } from './types';

// Extended API response type that includes items property
interface CategoryApiResponse extends ApiResponse<any> {
  items?: Category[];
  total?: number;
  skip?: number;
  limit?: number;
}

interface CategoryStore {
  categories: Category[];
  total: number;
  category: Category | null;
  loading: boolean;
  storeError: CategoryError | null;
  activeAction: CategoryAction | null;
  setActiveAction: (action: CategoryAction | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: CategoryError | null) => void;
  setCategory: (category: Category | null) => void;
  setCategories: (categories: Category[]) => void;
  fetchCategory: (id: string, headers?: Record<string, string>) => Promise<any>;
  fetchCategories: (filter?: CategoryFilter, headers?: Record<string, string>) => Promise<any>;
  createCategory: (data: any, headers?: Record<string, string>) => Promise<any>;
  updateCategory: (id: string, data: any, headers?: Record<string, string>) => Promise<any>;
  toggleCategoryStatus: (id: string, isActive: boolean, headers?: Record<string, string>) => Promise<any>;
  deleteCategory: (id: string, headers?: Record<string, string>) => Promise<boolean>;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  total: 0,
  category: null,
  loading: false,
  storeError: null,
  activeAction: null,

  setActiveAction: (action: CategoryAction | null) => set({ activeAction: action }),
  setLoading: (loading: boolean) => set({ loading }),
  setStoreError: (error: CategoryError | null) => set({ storeError: error }),
  setCategory: (category: Category | null) => set({ category }),
  setCategories: (categories: Category[]) => set({ categories }),

  fetchCategory: async (id: string, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError, setCategory, loading } = get();
    
    // Prevent concurrent fetches
    if (loading) {
      return null;
    }
    
    try {
      setActiveAction('fetchOne');
      setLoading(true);
      // Use direct API call instead of apiClient
      const response = await apiClient.get<any>(`/categories/${id}`, undefined, headers);
      
      // Process the API response
      
      // Try multiple possible response structures
      let categoryData = null;
      
      // Option 1: response.data.data structure
      if (response.data && response.data.data) {
        categoryData = response.data.data;
      } 
      // Option 2: response.data structure (direct)
      else if (response.data) {
        categoryData = response.data;
      }
      
      // Check if we found category data
      if (categoryData && (categoryData.name || categoryData.category_id || categoryData._id)) {
        // Ensure we have category_id
        if (!categoryData.category_id && categoryData._id) {
          categoryData.category_id = categoryData._id;
        }
        setCategory(categoryData);
        setLoading(false);
        return categoryData;
      }
      
      // Error occurred
      setLoading(false);
      throw new Error('Category data not found or in unexpected format');
    } catch (error: unknown) {
      // Error occurred
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch category';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setCategory(null);
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  fetchCategories: async (filter: CategoryFilter = {}, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError, setCategories, loading } = get();
    
    // Prevent concurrent fetches
    if (loading) {
      return { items: [], total: 0, skip: 0, limit: 10 };
    }
    
    try {
      setActiveAction('fetchList');
      setLoading(true);
      // Create params for API request
      const params: Record<string, string> = {};
      if (filter.skip) params.skip = filter.skip.toString();
      if (filter.limit) params.limit = filter.limit.toString();
      if (filter.search) params.search = filter.search;
      if (filter.is_active !== undefined) params.is_active = filter.is_active.toString();

      // Use direct API call instead of apiClient
      const queryString = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await apiClient.get<CategoryApiResponse>(`/categories/${queryString}`, undefined, headers);
      
      // Process the categories response
      
      // Check if response has a nested data property or is the data itself
      const categoryData = (response.data?.data || response.data) as CategoryApiResponse | null;

      if (categoryData) {
        const items = Array.isArray(categoryData.items) 
          ? categoryData.items 
          : Array.isArray(categoryData) 
            ? categoryData 
            : [];
        
        set({ categories: items, total: categoryData.total || items.length });
        setLoading(false);
        return { ...categoryData, items };
      }
      
      // Return empty result if no data
      const emptyResult = {
        items: [],
        total: 0,
        skip: filter.skip || 0,
        limit: filter.limit || 10
      };
      
      setLoading(false);
      return emptyResult;
    } catch (error: unknown) {
      // Error occurred
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  createCategory: async (data: any, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError } = get();
    try {
      setActiveAction('create');
      setLoading(true);
      
      // Ensure slug is present if name is provided and slug is missing
      if (data.name && !data.slug) {
        data.slug = data.name
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/&/g, '-and-')
          .replace(/[^\w\-]+/g, '')
          .replace(/--+/g, '-');
      }
      
      // Ensure data contains tenant_id if provided in headers
      if (headers && headers['X-Tenant-ID'] && !data.tenant_id) {
        data.tenant_id = headers['X-Tenant-ID'];
      }
      
      // Create category with the provided data
      const response = await apiClient.post<ApiResponse<any>>('/categories/', data, headers);
      
      let categoryData = null;
      
      if (response.data && response.data.data) {
        categoryData = response.data.data;
      } else if (response.data) {
        categoryData = response.data;
      }
      
      // Category created successfully
      setLoading(false);
      return categoryData;
    } catch (error: unknown) {
      // Error occurred
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  updateCategory: async (id: string, data: any, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError } = get();
    try {
      setActiveAction('update');
      setLoading(true);
      
      // Ensure slug is present if name is provided and slug is missing
      if (data.name && !data.slug) {
        data.slug = data.name
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/&/g, '-and-')
          .replace(/[^\w\-]+/g, '')
          .replace(/--+/g, '-');
      }
      
      // Ensure data contains tenant_id if provided in headers
      if (headers && headers['X-Tenant-ID'] && !data.tenant_id) {
        data.tenant_id = headers['X-Tenant-ID'];
      }
      
      // Make sure category_id is included
      if (!data.category_id && id) {
        data.category_id = id;
      }
      
      // Update category with the provided data
      const response = await apiClient.put<ApiResponse<any>>(`/categories/${id}`, data, headers);
      
      let categoryData = null;
      
      if (response.data && response.data.data) {
        categoryData = response.data.data;
      } else if (response.data) {
        categoryData = response.data;
      }
      
      // Category updated successfully
      setLoading(false);
      return categoryData;
    } catch (error: unknown) {
      // Error occurred
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  toggleCategoryStatus: async (id: string, isActive: boolean, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError, fetchCategory } = get();
    try {
      setActiveAction('update');
      setLoading(true);
      
      // Get current category data
      const category = await fetchCategory(id, headers);
      
      if (!category) {
        throw new Error('Category not found');
      }
      
      // Prepare update data with the new status
      const updateData = {
        ...category,
        is_active: isActive,
      };
      
      // Ensure data contains tenant_id if provided in headers
      if (headers && headers['X-Tenant-ID'] && !updateData.tenant_id) {
        updateData.tenant_id = headers['X-Tenant-ID'];
      }
      
      // Update category with the new status
      const response = await apiClient.put<ApiResponse<any>>(`/categories/${id}`, updateData, headers);
      
      let categoryData = null;
      
      if (response.data && response.data.data) {
        categoryData = response.data.data;
      } else if (response.data) {
        categoryData = response.data;
      }
      
      // Category status updated successfully
      setLoading(false);
      return categoryData;
    } catch (error: unknown) {
      // Error occurred
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category status';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },
  
  deleteCategory: async (id: string, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setStoreError } = get();
    try {
      setActiveAction('delete');
      setLoading(true);
      
      // Ensure headers are properly set for tenant identification
      // Make a copy of headers to avoid mutating the original object
      const requestHeaders = { ...headers };
      
      // Delete category by ID using headers (not in payload)
      await apiClient.delete<ApiResponse<any>>(`/categories/${id}`, undefined, requestHeaders);
      
      // Category deleted successfully
      setLoading(false);
      return true;
    } catch (error: unknown) {
      // Error occurred
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
      const errorStatus = (error as any)?.response?.status;
      setStoreError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  }
}));
