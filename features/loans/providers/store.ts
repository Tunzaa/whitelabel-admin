import { create } from 'zustand';
import { LoanProvider, LoanProviderFilter, LoanProviderListResponse, LoanProviderAction, LoanProviderError, LoanProviderFormValues } from './types';
import { apiClient } from '@/lib/api/client';
import { ApiResponse } from '@/lib/core/api';

interface LoanProviderStore {
  providers: LoanProvider[];
  provider: LoanProvider | null;
  loading: boolean;
  storeError: LoanProviderError | null;
  activeAction: LoanProviderAction | null;
  
  // UI State
  setActiveAction: (action: LoanProviderAction | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: LoanProviderError | null) => void;
  setProvider: (provider: LoanProvider | null) => void;
  setProviders: (providers: LoanProvider[]) => void;
  
  // API Methods
  fetchProvider: (id: string, headers?: Record<string, string>) => Promise<LoanProvider>;
  fetchProviders: (filter?: LoanProviderFilter, headers?: Record<string, string>) => Promise<LoanProviderListResponse>;
  createProvider: (data: LoanProviderFormValues, headers?: Record<string, string>) => Promise<LoanProvider>;
  updateProvider: (id: string, data: Partial<LoanProviderFormValues>, headers?: Record<string, string>) => Promise<LoanProvider>;
  updateProviderStatus: (id: string, isActive: boolean, headers?: Record<string, string>) => Promise<void>;
  deleteProvider: (id: string, headers?: Record<string, string>) => Promise<void>;
}

export const useLoanProviderStore = create<LoanProviderStore>()(
  (set, get) => ({
    providers: [],
    provider: null,
    loading: false,
    storeError: null,
    activeAction: null,

    setActiveAction: (action) => set({ activeAction: action }),
    setLoading: (loading) => set({ loading }),
    setStoreError: (error) => set({ storeError: error }),
    setProvider: (provider) => set({ provider }),
    setProviders: (providers) => set({ providers }),

    fetchProvider: async (id: string, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setProvider, activeAction, provider: currentProvider } = get();
      
      // If we're already fetching this exact provider, don't trigger again
      if (activeAction === 'fetchOne' && currentProvider?.provider_id === id) {
        return currentProvider;
      }
      
      try {
        setActiveAction('fetchOne');
        setLoading(true);
        
        const response = await apiClient.get<LoanProvider>(`/loans/providers/${id}`, undefined, headers);
        const rawBody = (response.data as ApiResponse<LoanProvider>).data || response.data;
        const rawData = Array.isArray(rawBody) ? (rawBody[0] as LoanProvider) : (rawBody as LoanProvider);
        
        if (!rawData) {
          throw new Error('Provider not found');
        }
        
        // Normalize is_active if it's missing but status is present
        const provider = {
          ...rawData,
          is_active: rawData.is_active !== undefined ? rawData.is_active : (rawData.status === 'ACTIVE')
        };
        
        setProvider(provider);
        setLoading(false);
        return provider;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch loan provider';
        const errorStatus = (error as { response?: { status?: number } })?.response?.status;
        setStoreError({
          message: errorMessage,
          status: errorStatus,
        });
        setProvider(null);
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    fetchProviders: async (filter: LoanProviderFilter = {}, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setProviders } = get();
      try {
        setActiveAction('fetchList');
        setLoading(true);
        
        // Postman: GET /v1/loans/providers/
        const response = await apiClient.get<LoanProvider[]>('/loans/providers/', filter, headers);
        
        // Handle both direct array and wrapped response formats
        const rawData = response.data as unknown as (ApiResponse<LoanProvider[]> | LoanProvider[]);
        const providersList = (Array.isArray(rawData) ? rawData : ((rawData as ApiResponse<LoanProvider[]>).data || [])).map((p: LoanProvider) => ({
          ...p,
          is_active: p.is_active !== undefined ? p.is_active : (p.status === 'ACTIVE')
        }));
        
        const isWrapped = !Array.isArray(rawData);
        const metadata = (isWrapped ? rawData : {}) as { total?: number; skip?: number; limit?: number };
        const providerResponse: LoanProviderListResponse = {
          items: providersList,
          total: metadata.total ?? providersList.length,
          skip: metadata.skip ?? (filter.skip || 0),
          limit: metadata.limit ?? (filter.limit || 10)
        };
        
        setProviders(providersList);
        setLoading(false);
        return providerResponse;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch loan providers';
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

    createProvider: async (data: LoanProviderFormValues, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError } = get();
      try {
        setActiveAction('create');
        setLoading(true);
        
        // Map form values to API payload
        const payload = {
          ...data,
        };
        
        const response = await apiClient.post<LoanProvider>('/loans/providers/', payload, headers);
        // Handle both direct and wrapped responses
        const rawBody = (response.data as ApiResponse<LoanProvider>).data || response.data;
        const newProvider = Array.isArray(rawBody) ? (rawBody[0] as LoanProvider) : (rawBody as LoanProvider);
        
        setLoading(false);
        return newProvider;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to register loan provider';
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

    updateProvider: async (id: string, data: Partial<LoanProviderFormValues>, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setProvider, providers, setProviders } = get();
      try {
        setActiveAction('update');
        setLoading(true);
        
        const response = await apiClient.put<LoanProvider>(`/loans/providers/${id}`, data, headers);
        // Handle both direct and wrapped responses
        const rawBody = (response.data as ApiResponse<LoanProvider>).data || response.data;
        const updatedProvider = Array.isArray(rawBody) ? (rawBody[0] as LoanProvider) : (rawBody as LoanProvider);
        
        // Update local state
        const updatedProviders = providers.map(p => p.provider_id === id ? updatedProvider : p);
        setProviders(updatedProviders);
        setProvider(updatedProvider);
        
        setLoading(false);
        return updatedProvider;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update loan provider';
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

    updateProviderStatus: async (id: string, isActive: boolean, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, providers, setProviders } = get();
      try {
        setActiveAction('updateStatus');
        setLoading(true);
        
        await apiClient.patch<void>(`/loans/providers/${id}/status`, { is_active: isActive }, headers);
        
        // Update local state
        const updatedProviders = providers.map(p => 
          p.provider_id === id ? { ...p, is_active: isActive } : p
        );
        setProviders(updatedProviders);
        
        setLoading(false);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update loan provider status';
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
    
    deleteProvider: async (id: string, headers?: Record<string, string>) => {
      const { setLoading, setStoreError, providers, setProviders } = get();
      try {
        setLoading(true);
        await apiClient.delete(`/loans/providers/${id}`, undefined, headers);
        
        // Update local state
        const updatedProviders = providers.filter(p => p.provider_id !== id);
        setProviders(updatedProviders);
        
        setLoading(false);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete loan provider';
        const errorStatus = (error as { response?: { status?: number } })?.response?.status;
        setStoreError({
          message: errorMessage,
          status: errorStatus,
        });
        setLoading(false);
        throw error;
      }
    }
  })
);
