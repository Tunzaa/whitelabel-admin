import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import {
  Delivery,
  DeliveryFilter,
  DeliveryListResponse,
  DeliveryError,
  DeliveryStage,
  PickupPoint,
  ApiResponse,
} from './types';

// Helper util to safely unwrap various API response formats
const unwrapApiResponse = <T>(response: any): T | null => {
  if (!response) return null;
  const data = response.data ? response.data : response;
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }
  return data as T;
};

interface DeliveryStore {
  deliveries: DeliveryListResponse | null;
  delivery: Delivery | null;
  loading: boolean;
  storeError: DeliveryError | null;
  activeAction: string | null;

  // state setters
  setActiveAction: (action: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: DeliveryError | null) => void;
  setDelivery: (delivery: Delivery | null) => void;
  setDeliveries: (list: DeliveryListResponse | null) => void;

  // API methods
  fetchDeliveries: (
    filter?: DeliveryFilter,
    headers?: Record<string, string>
  ) => Promise<DeliveryListResponse | null>;
  fetchDelivery: (
    id: string,
    headers?: Record<string, string>
  ) => Promise<Delivery | null>;
  addStage: (
    deliveryId: string,
    stage: DeliveryStage,
    headers?: Record<string, string>
  ) => Promise<Delivery | null>;
  addPickupPoint: (
    deliveryId: string,
    pickup: PickupPoint,
    headers?: Record<string, string>
  ) => Promise<Delivery | null>;
}

export const useDeliveryStore = create<DeliveryStore>()((set, get) => ({
  deliveries: null,
  delivery: null,
  loading: false,
  storeError: null,
  activeAction: null,

  // setters
  setActiveAction: (action) => set({ activeAction: action }),
  setLoading: (loading) => set({ loading }),
  setStoreError: (error) => set({ storeError: error }),
  setDelivery: (delivery) => set({ delivery }),
  setDeliveries: (list) => set({ deliveries: list }),

  // Fetch list of deliveries with optional filters
  fetchDeliveries: async (filter = {}, headers) => {
    const { setActiveAction, setLoading, setStoreError, setDeliveries } = get();
    try {
      setActiveAction('fetchDeliveries');
      setLoading(true);

      const params = new URLSearchParams();
      if (filter.skip) params.append('skip', filter.skip.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.search) params.append('query', filter.search);
      if (filter.status) params.append('status', filter.status);
      if (filter.stage) params.append('stage', filter.stage);
      if (filter.partnerId) params.append('partner_id', filter.partnerId);
      if (filter.orderId) params.append('order_id', filter.orderId);
      if (filter.includeOrderNumbers) params.append('include_order_numbers', filter.includeOrderNumbers);
      if (filter.includePartnerNames) params.append('include_partner_names', filter.includePartnerNames);

      const response = await apiClient.get<any>(
        `/deliveries/?${params.toString()}`,
        undefined,
        headers
      );

      // The response may be wrapped; try to normalise
      let list: DeliveryListResponse | null = null;
      const unwrapped = unwrapApiResponse<any>(response);
      if (unwrapped) {
        // If server already returns the DeliveryListResponse shape
        if ('items' in unwrapped && 'total' in unwrapped) {
          list = unwrapped as DeliveryListResponse;
        } else if (Array.isArray(unwrapped)) {
          list = {
            items: unwrapped as Delivery[],
            total: (unwrapped as Delivery[]).length,
            skip: filter.skip || 0,
            limit: filter.limit || (unwrapped as Delivery[]).length,
          };
        }
      }

      setDeliveries(list);
      return list;
    } catch (error: any) {
      setStoreError({ message: error.message || 'Failed to fetch deliveries', status: error.response?.status });
      throw error;
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  },

  // Fetch single delivery by id
  fetchDelivery: async (id, headers) => {
    const { setActiveAction, setLoading, setStoreError, setDelivery, loading } = get();
    
    // Prevent concurrent fetches
    if (loading) {
      return;
    }
    
    try {
      setActiveAction('fetchDelivery');
      setLoading(true);
      const response = await apiClient.get<any>(`/deliveries/${id}`, {"include_partner_details": true}, headers);
      const delivery = unwrapApiResponse<Delivery>(response);
      setDelivery(delivery);
      return delivery;
    } catch (error: any) {
      setStoreError({ message: error.message || 'Failed to fetch delivery', status: error.response?.status });
      throw error;
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  },

  // Add a new stage to a delivery
  addStage: async (deliveryId, stage, headers) => {
    const { setDelivery, delivery } = get();
    try {
      const response = await apiClient.post<ApiResponse<Delivery>>(
        `/deliveries/${deliveryId}/stages`,
        stage,
        headers
      );
      const updated = unwrapApiResponse<Delivery>(response);
      if (updated) setDelivery(updated);
      return updated;
    } catch (error: any) {
      throw error;
    }
  },

  // Add a pickup point
  addPickupPoint: async (deliveryId, pickup, headers) => {
    const { setDelivery } = get();
    try {
      const response = await apiClient.post<ApiResponse<Delivery>>(
        `/deliveries/${deliveryId}/pickup-points`,
        pickup,
        headers
      );
      const updated = unwrapApiResponse<Delivery>(response);
      if (updated) setDelivery(updated);
      return updated;
    } catch (error: any) {
      throw error;
    }
  },
}));
