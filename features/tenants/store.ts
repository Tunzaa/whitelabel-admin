import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Tenant,
  TenantFilter,
  TenantListResponse,
  TenantAction,
  TenantError,
  BillingDashboardMetrics,
  BillingConfig,
  Invoice,
  InvoiceListResponse as InvoiceListResponseType,
} from "./types";
import { apiClient } from '@/lib/api/client';
import { toast } from "sonner";
import { useUserStore } from '@/features/auth/stores/user-store';
import { setCachedData, getCachedData, CACHE_KEYS } from '@/lib/cache';

interface TenantState {
  selectedTenantId: string | null;
  selectedTenantName: string | null;
  setSelectedTenant: (id: string | null, name?: string | null) => void;
  clearSelectedTenant: () => void;
}

export const useSelectedTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      selectedTenantId: null,
      selectedTenantName: null,
      setSelectedTenant: (id, name = null) => set({ selectedTenantId: id, selectedTenantName: name }),
      clearSelectedTenant: () => set({ selectedTenantId: null, selectedTenantName: null }),
    }),
    {
      name: 'selected-tenant-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Helper to get/set cached selected tenant
const getCachedSelectedTenant = (): Tenant | null => {
  return getCachedData<Tenant>(CACHE_KEYS.SELECTED_TENANT);
};

const setCachedSelectedTenant = (tenant: Tenant): void => {
  setCachedData(CACHE_KEYS.SELECTED_TENANT, tenant);
};

interface TenantStore {
  tenants: Tenant[];
  tenant: Tenant | null;
  billingDashboardMetrics: BillingDashboardMetrics | null;
  billingConfig: BillingConfig | null;
  invoices: Invoice[];
  invoicesTotal: number;
  selectedInvoice: Invoice | null;
  loadingSelectedInvoice: boolean;
  loading: boolean;
  loadingBillingConfig: boolean;
  loadingInvoices: boolean;
  isUpdating: boolean;
  storeError: TenantError | null;
  billingConfigError: TenantError | null;
  invoicesError: TenantError | null;
  activeAction: TenantAction | null;
  setActiveAction: (action: TenantAction | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: TenantError | null) => void;
  setTenant: (tenant: Tenant) => void;
  setTenants: (tenants: Tenant[]) => void;
  fetchTenant: (id: string) => Promise<Tenant>;
  fetchTenants: (filter?: TenantFilter, skipCache?: boolean) => Promise<TenantListResponse>;
  fetchBillingDashboardMetrics: () => Promise<void>;
  fetchBillingConfig: (tenantId: string) => Promise<void>;
  fetchInvoices: (params: {
    tenantId: string;
    status?: string;
    skip?: number;
    limit?: number;
  }) => Promise<void>;
  generateInvoices: (tenantId: string) => Promise<void>;
  fetchInvoiceDetails: (invoiceId: string) => Promise<void>;
  clearSelectedInvoice: () => void;
  createTenant: (data: Partial<Tenant>) => Promise<Tenant>;
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<Tenant>;
  deactivateTenant: (id: string) => Promise<void>;
}

export const useTenantStore = create<TenantStore>()(
  (set, get) => ({
      tenants: [],
      tenant: null,
      billingDashboardMetrics: null,
      billingConfig: null,
      invoices: [],
      invoicesTotal: 0,
      selectedInvoice: null,
      loadingSelectedInvoice: false,
      loading: false,
      loadingBillingConfig: false,
      loadingInvoices: false,
      isUpdating: false,
      storeError: null,
      billingConfigError: null,
      invoicesError: null,
      activeAction: null,

      setActiveAction: (action) => set({ activeAction: action }),
      setLoading: (loading) => set({ loading }),
      setStoreError: (error) => set({ storeError: error }),
      setTenant: (tenant) => set({ tenant }),
      setTenants: (tenants) => set({ tenants }),

      fetchTenant: async (id: string, skipCache = false) => {
        if (!id || id === 'null' || id === 'undefined') {
          return null as any;
        }

        const { setActiveAction, setLoading, setStoreError, setTenant, loading } = get();

        // Prevent concurrent fetches
        if (loading) {
          return null;
        }

        // Check cache first (unless skipped)
        if (!skipCache) {
          const cachedTenant = getCachedSelectedTenant();
          if (cachedTenant && cachedTenant.tenant_id === id) {
            setTenant(cachedTenant);
            setLoading(false);
            return cachedTenant;
          }
        }

        try {
          setActiveAction('fetch');
          setLoading(true);
          const response = await apiClient.get<Tenant>(`/tenants/${id}`);
          if (response.data) {
            // Handle ApiResponse wrapper if present
            const tenantData = (response.data as any).data || response.data;
            
            setTenant(tenantData);

            // Cache as selected tenant
            setCachedSelectedTenant(tenantData);

            setLoading(false);
            return tenantData;
          }
          throw new Error('Tenant not found');
        } catch (error: any) {
          setStoreError({
            message: error instanceof Error ? error.message : 'Failed to fetch tenant',
            status: error.response?.status || 500,
          });
          setTenant(null);
          setLoading(false);
          throw error;
        } finally {
          setActiveAction(null);
        }
      },

      fetchTenants: async (filter: TenantFilter = {}, skipCache = false) => {
        const { setActiveAction, setLoading, setStoreError, setTenants, loading } = get();

        // Prevent concurrent fetches
        if (loading) {
          return null as any;
        }

        // Check cache first (only for default filter and if not skipped)
        if (!skipCache && !filter.skip && !filter.limit && !filter.search && filter.isActive === undefined) {
          const cachedTenants = getCachedData<{ tenants: Tenant[]; total: number }>(CACHE_KEYS.TENANTS);
          if (cachedTenants?.tenants) {
            setTenants(cachedTenants.tenants);
            setLoading(false);
            return {
              items: cachedTenants.tenants,
              total: cachedTenants.total || cachedTenants.tenants.length,
              skip: 0,
              limit: cachedTenants.tenants.length
            };
          }
        }

        try {
          setActiveAction('fetchList');
          setLoading(true);
          const params = new URLSearchParams();
          if (filter.skip) params.append('skip', filter.skip.toString());
          if (filter.limit) params.append('limit', filter.limit.toString());
          if (filter.search) params.append('search', filter.search);
          if (filter.isActive !== undefined) params.append('isActive', filter.isActive.toString());

          const response = await apiClient.get<TenantListResponse>(`/tenants/?${params.toString()}`);
          if (response.data) {
            // Check if response.data follows the ApiResponse wrapper pattern or the direct TenantListResponse pattern
            const data = (response.data as any).data || response.data;
            const items = data.items || [];
            const total = data.total || 0;
            const skip = data.skip || 0;
            const limit = data.limit || items.length;

            setTenants(items);

            // Cache the tenant list (only for default filter)
            if (!filter.skip && !filter.limit && !filter.search && filter.isActive === undefined) {
              setCachedData(CACHE_KEYS.TENANTS, {
                tenants: items,
                total: total,
              });
            }

            // Update selected tenant cache if it's in the list
            const { selectedTenantId } = useSelectedTenantStore.getState();
            if (selectedTenantId) {
              const selectedTenant = items.find(t => t.tenant_id === selectedTenantId);
              if (selectedTenant) {
                setCachedSelectedTenant(selectedTenant);
              }
            }

            return { items, total, skip, limit };
          }
          throw new Error('Failed to fetch tenants');
        } catch (error: any) {
          setStoreError({
            message: error instanceof Error ? error.message : 'Failed to fetch tenants',
            status: error.response?.status || 500,
          });
          throw error;
        } finally {
          setLoading(false);
          setActiveAction(null);
        }
      },

      createTenant: async (data: Partial<Tenant>) => {
        const { setActiveAction, setLoading, setStoreError, setTenant } = get();
        try {
          setActiveAction('create');
          setLoading(true);
          const response = await apiClient.post<Tenant>('/tenants/', data);
          if (response.data) {
            const tenantData = (response.data as any).data || response.data;
            setTenant(tenantData);
            return tenantData;
          }
          setStoreError({ 
            message: 'Failed to create tenant',
            status: 500
          });
        } catch (error: any) {
          setStoreError({
            message: error instanceof Error ? error.message : 'Failed to create tenant',
            status: error.response?.status || 500,
          });
          throw error;
        } finally {
          setLoading(false);
          setActiveAction(null);
        }
      },

      updateTenant: async (id: string, data: Partial<Tenant>) => {
        const { setActiveAction, setLoading, setStoreError, setTenant } = get();
        try {
          setActiveAction('update');
          setLoading(true);
          const response = await apiClient.put<Tenant>(`/tenants/${id}`, data);
          if (response.data) {
            const tenantData = (response.data as any).data || response.data;
            setTenant(tenantData);
            
            // Update cache if this is the selected tenant
            const { selectedTenantId } = useSelectedTenantStore.getState();
            if (selectedTenantId === id) {
              setCachedSelectedTenant(tenantData);
            }
            
            return tenantData;
          }
          setStoreError({ 
            message: 'Failed to update tenant',
            status: 500
          });
        } catch (error: any) {
          setStoreError({
            message: error instanceof Error ? error.message : 'Failed to update tenant',
            status: error.response?.status || 500,
          });
          throw error;
        } finally {
          setLoading(false);
          setActiveAction(null);
        }
      },

      deactivateTenant: async (id: string) => {
        const { setActiveAction, setLoading, setStoreError } = get();
        try {
          setActiveAction('deactivate');
          setLoading(true);
          await apiClient.put(`/tenants/${id}/deactivate`);
        } catch (error) {
          setStoreError({
            message: error instanceof Error ? error.message : 'Failed to deactivate tenant',
          });
          throw error;
        } finally {
          setLoading(false);
          setActiveAction(null);
        }
      },



      // Tenant Billing APIs
      fetchBillingDashboardMetrics: async () => {
        const { setLoading, setStoreError, loading } = get();
        
        // Prevent concurrent fetches
        if (loading) {
          return;
        }
        
        try {
          setLoading(true);
          const response = await apiClient.get<BillingDashboardMetrics>('/billing/dashboard');
          if (response.data) {
            set({ billingDashboardMetrics: response.data });
          }
        } catch (error) {
          setStoreError({
            message:
              error instanceof Error ? error.message : 'Failed to fetch billing dashboard metrics',
            status: error.response?.status,
          });
        } finally {
          setLoading(false);
        }
      },

      

      fetchBillingConfig: async (tenantId: string) => {
        set({ loadingBillingConfig: true, storeError: null });
        try {
          const response = await apiClient.get<BillingConfig>(
            `/billing/config/${tenantId}`
          );
          if (response.data) {
            set({ billingConfig: response.data, loadingBillingConfig: false });
          } else {
            set({ billingConfig: null, loadingBillingConfig: false });
          }
        } catch (error: any) {
          const errorMsg =
            error.response?.data?.message || "Failed to fetch billing configuration.";
          if (error.response?.status !== 404) {
            toast.error(errorMsg);
          }
          set({
            billingConfig: null,
            billingConfigError: { status: error.response?.status, message: errorMsg },
            loadingBillingConfig: false,
          });
        }
      },
    
      fetchInvoices: async (params) => {
        const { tenantId, status, skip = 0, limit = 10 } = params;
        set({ loadingInvoices: true, storeError: null });
        try {
          const queryParams = new URLSearchParams({
            tenant_id: tenantId,
            skip: skip.toString(),
            limit: limit.toString(),
          });
          if (status && status !== "all") {
            queryParams.append("status", status);
          }
          const response = await apiClient.get<InvoiceListResponseType>(
            `/billing/invoices?${queryParams.toString()}`
          );
          const data = response.data;
          if (data && Array.isArray(data.items)) {
            set({
              invoices: data.items,
              invoicesTotal: data.total || 0,
              loadingInvoices: false,
            });
          } else {
            // Handle cases where response is not the expected shape
            set({ invoices: [], invoicesTotal: 0, loadingInvoices: false });
          }
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || "Failed to fetch invoices.";
          toast.error(errorMsg);
          set({
            invoicesError: { status: error.response?.status, message: errorMsg },
            loadingInvoices: false,
          });
        }
      },
    
      generateInvoices: async (tenantId: string) => {
        set({ isUpdating: true });
        try {
          await apiClient.post("/billing/invoices/generate", { tenant_id: tenantId });
          toast.success("Invoice generation process started successfully.");
          setTimeout(() => get().fetchInvoices({ tenantId, status: 'pending' }), 2000);
        } catch (error: any) {
          let errorMsg = "Failed to generate invoice. Please try again later.";
          if (error.response?.status === 409) {
            errorMsg = error.response?.data?.detail || "Invoice already exists for this billing period.";
          } else if (error.response?.data?.detail) {
            errorMsg = error.response.data.detail;
          }

          if (error.response?.status >= 500) {
            toast.error("An unexpected server error occurred.");
          } else {
            toast.error(errorMsg);
          }

          set({
            storeError: { status: error.response?.status, message: errorMsg },
          });
        } finally {
          set({ isUpdating: false });
        }
      },

      fetchInvoiceDetails: async (invoiceId: string) => {
        set({ loadingSelectedInvoice: true });
        try {
          const response = await apiClient.get<{ data: Invoice }>(`/billing/invoices/${invoiceId}`);
          set({ selectedInvoice: response.data, loadingSelectedInvoice: false });
        } catch (error) {
          toast.error("Failed to fetch invoice details.");
          set({ selectedInvoice: null, loadingSelectedInvoice: false });
        }
      },

      clearSelectedInvoice: () => {
        set({ selectedInvoice: null });
      },

      createBillingConfig: async (billingConfigData: any) => {
        set({ loadingBillingConfig: true, storeError: null });
        try {
          const response = await apiClient.post<BillingConfig>(
            `/billing/config`,
            billingConfigData
          );
          if (response.data) {
            set({ billingConfig: response.data, loadingBillingConfig: false });
            toast.success("Billing configuration created successfully!");
            return response.data;
          }
        } catch (error: any) {
          const errorMsg =
            error.response?.data?.message || "Failed to create billing configuration.";
          toast.error(errorMsg);
          set({
            billingConfigError: { status: error.response?.status, message: errorMsg },
            loadingBillingConfig: false,
          });
          throw error;
        }
      },

      updateBillingConfig: async (tenantId: string, billingConfigData: any) => {
        set({ loadingBillingConfig: true, storeError: null });
        try {
          const response = await apiClient.put<BillingConfig>(
            `/billing/config/${tenantId}`,
            billingConfigData
          );
          if (response.data) {
            set({ billingConfig: response.data, loadingBillingConfig: false });
            toast.success("Billing configuration updated successfully!");
            return response.data;
          }
        } catch (error: any) {
          const errorMsg =
            error.response?.data?.message || "Failed to update billing configuration.";
          toast.error(errorMsg);
          set({
            billingConfigError: { status: error.response?.status, message: errorMsg },
            loadingBillingConfig: false,
          });
          throw error;
        }
      },
    })
);