import { create } from 'zustand';
import { LoanProvider, LoanProviderFilter, LoanProviderListResponse, LoanProviderAction, LoanProviderError, LoanProviderFormValues } from './types';
import { apiClient } from '@/lib/api/client';
import { ApiResponse } from '@/lib/core/api';

interface LoanProviderStore {
  providers: LoanProviderListResponse | null;
  provider: LoanProvider | null;
  loading: boolean;
  storeError: LoanProviderError | null;
  activeAction: LoanProviderAction | null;

  // UI State
  setActiveAction: (action: LoanProviderAction | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: LoanProviderError | null) => void;
  setProvider: (provider: LoanProvider | null) => void;
  setProviders: (providers: LoanProviderListResponse | null) => void;
  
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
    providers: null,
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

        console.log('[Loan Providers Store] Raw API response:', response.data);

        // Handle both direct array, wrapped with .data, and wrapped with .items response formats
        const rawData = response.data as unknown as (ApiResponse<LoanProvider[]> | LoanProvider[] | LoanProviderListResponse);
        let providersList: LoanProvider[] = [];

        if (Array.isArray(rawData)) {
          // Direct array
          providersList = rawData.map((p: any) => ({
            ...p,
            is_active: p.is_active !== undefined ? p.is_active : (p.status === 'ACTIVE'),
          })) as LoanProvider[];
        } else if ('items' in rawData && Array.isArray(rawData.items)) {
          // Wrapped with .items (paginated response)
          providersList = rawData.items.map((p: any) => ({
            ...p,
            is_active: p.is_active !== undefined ? p.is_active : (p.status === 'ACTIVE'),
          })) as LoanProvider[];
        } else if ('data' in rawData && Array.isArray(rawData.data)) {
          // Wrapped with .data (ApiResponse format)
          providersList = rawData.data.map((p: any) => ({
            ...p,
            is_active: p.is_active !== undefined ? p.is_active : (p.status === 'ACTIVE'),
          })) as LoanProvider[];
        }

        console.log('[Loan Providers Store] Processed providersList:', providersList);

        // Extract metadata from the response
        let total = providersList.length;
        let skip = filter.skip || 0;
        let limit = filter.limit || 10;

        if ('items' in rawData && typeof rawData === 'object' && rawData !== null) {
          // Response is already in paginated format with .items
          total = (rawData as any).total ?? providersList.length;
          skip = (rawData as any).skip ?? (filter.skip || 0);
          limit = (rawData as any).limit ?? (filter.limit || 10);
        } else if ('data' in rawData && typeof rawData === 'object' && rawData !== null) {
          // Response is in ApiResponse format with .data
          total = (rawData as any).total ?? providersList.length;
          skip = (rawData as any).skip ?? (filter.skip || 0);
          limit = (rawData as any).limit ?? (filter.limit || 10);
        }

        const providerResponse: LoanProviderListResponse = {
          items: providersList,
          total,
          skip,
          limit
        };

        console.log('[Loan Providers Store] Setting providers:', providerResponse);
        setProviders(providerResponse);
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
        const updatedProviders = providers?.items?.map(p => p.provider_id === id ? updatedProvider : p) || [];
        setProviders({ ...providers!, items: updatedProviders });
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
        const updatedProviders = providers?.items?.map(p =>
          p.provider_id === id ? { ...p, is_active: isActive } : p
        ) || [];
        setProviders({ ...providers!, items: updatedProviders });

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
        const updatedProviders = providers?.items?.filter(p => p.provider_id !== id) || [];
        setProviders({ ...providers!, items: updatedProviders });

        setLoading(false);
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to delete loan provider',
          status: (error as { response?: { status?: number } })?.response?.status
        });
        setLoading(false);
        throw error;
      }
    }
  })
);
