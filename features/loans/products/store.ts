import { create } from 'zustand';
import { LoanProduct, LoanProductFilter, LoanProductListResponse, LoanProductAction, LoanProductError, LoanProductFormValues } from './types';
import { apiClient } from '@/lib/api/client';

interface LoanProductStore {
  products: LoanProduct[];
  product: LoanProduct | null;
  loading: boolean;
  storeError: LoanProductError | null;
  activeAction: LoanProductAction | null;
  
  // UI State
  setActiveAction: (action: LoanProductAction | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: LoanProductError | null) => void;
  setProduct: (product: LoanProduct | null) => void;
  setProducts: (products: LoanProduct[]) => void;
  
  // API Methods
  fetchProduct: (id: string, headers?: Record<string, string>) => Promise<LoanProduct>;
  fetchProducts: (filter?: LoanProductFilter, headers?: Record<string, string>) => Promise<LoanProductListResponse>;
  createProduct: (data: LoanProductFormValues, headers?: Record<string, string>) => Promise<LoanProduct>;
  updateProduct: (id: string, data: Partial<LoanProductFormValues>, headers?: Record<string, string>) => Promise<LoanProduct>;
  updateProductStatus: (id: string, isActive: boolean, headers?: Record<string, string>) => Promise<void>;
}

export const useLoanProductStore = create<LoanProductStore>()(
  (set, get) => ({
    products: [],
    product: null,
    loading: false,
    storeError: null,
    activeAction: null,

    setActiveAction: (action) => set({ activeAction: action }),
    setLoading: (loading) => set({ loading }),
    setStoreError: (error) => set({ storeError: error }),
    setProduct: (product) => set({ product }),
    setProducts: (products) => set({ products }),

    fetchProduct: async (id: string, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setProduct } = get();
      try {
        setActiveAction('fetchOne');
        setLoading(true);
        
        const response = await apiClient.get<LoanProduct>(`/loans/products/${id}`, undefined, headers);
        const product = response.data.data;
        
        setProduct(product);
        setLoading(false);
        return product;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch loan product';
        const errorStatus = (error as { response?: { status?: number } })?.response?.status;
        setStoreError({
          message: errorMessage,
          status: errorStatus,
        });
        setProduct(null);
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    fetchProducts: async (filter: LoanProductFilter = {}, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setProducts } = get();
      try {
        setActiveAction('fetchList');
        setLoading(true);
        
        let url = '/loans/products/';
        if (filter.provider_id) {
          url = `/loans/products/provider/${filter.provider_id}`;
        }
        
        const response = await apiClient.get<LoanProduct[]>(url, filter, headers);
        
        // Handle both direct array and wrapped response formats
        const rawData = response.data as any;
        const productsList = Array.isArray(rawData) ? rawData : (rawData.data || []);
        
        const productResponse: LoanProductListResponse = {
          items: productsList,
          total: rawData.total || productsList.length,
          skip: rawData.skip || filter.skip || 0,
          limit: rawData.limit || filter.limit || 10
        };
        
        setProducts(productsList);
        setLoading(false);
        return productResponse;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch provider loan products';
        const errorStatus = (error as { response?: { status?: number } })?.response?.status;
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

    createProduct: async (data: LoanProductFormValues, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError } = get();
      try {
        setActiveAction('create');
        setLoading(true);
        
        const payload = {
          ...data,
          interest_rate: parseFloat(data.interest_rate),
          min_amount: data.min_amount ? parseFloat(data.min_amount) : undefined,
          max_amount: data.max_amount ? parseFloat(data.max_amount) : undefined,
          processing_fee: data.processing_fee ? parseFloat(data.processing_fee) : undefined
        };
        
        const response = await apiClient.post<LoanProduct>('/loans/products/', payload, headers);
        // Handle both direct and wrapped responses
        const newProduct = (response.data as any).data || response.data;
        
        setLoading(false);
        return newProduct;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create loan product';
        const errorStatus = (error as { response?: { status?: number } })?.response?.status;
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

    updateProduct: async (id: string, data: Partial<LoanProductFormValues>, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setProduct, products, setProducts } = get();
      try {
        setActiveAction('update');
        setLoading(true);
        
        const response = await apiClient.put<LoanProduct>(`/loans/products/${id}`, data, headers);
        // Handle both direct and wrapped responses
        const updatedProduct = (response.data as any).data || response.data;
        
        const updatedProducts = products.map(p => p.product_id === id ? updatedProduct : p);
        setProducts(updatedProducts);
        setProduct(updatedProduct);
        
        setLoading(false);
        return updatedProduct;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update loan product';
        const errorStatus = (error as { response?: { status?: number } })?.response?.status;
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

    updateProductStatus: async (id: string, isActive: boolean, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, products, setProducts } = get();
      try {
        setActiveAction('updateStatus');
        setLoading(true);
        
        await apiClient.patch<void>(`/loans/products/${id}/status`, { is_active: isActive }, headers);
        
        const updatedProducts = products.map(p => 
          p.product_id === id ? { ...p, is_active: isActive } : p
        );
        setProducts(updatedProducts);
        
        setLoading(false);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update loan product status';
        const errorStatus = (error as { response?: { status?: number } })?.response?.status;
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
  })
);
