import { create } from "zustand";
import { apiClient } from "@/lib/api/client";
import {
  Order,
  OrderFilter,
  OrderListResponse,
  OrderError,
  OrderStatus,
  PaymentStatus,
  ApiResponse,
  DeliveryDetails,
  AssignDeliveryPayload,
  AddDeliveryStagePayload,
  OrderApiResponse,
} from "./types";

// Helper to safely unwrap API responses, handling multiple formats.
const unwrapApiResponse = <T>(response: any): T | null => {
  if (!response) {
    return null;
  }
  // The actual data might be in response.data
  const data = response.data ? response.data : response;
  // Handle wrapped responses like { success: boolean, data: T }
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }
  // Handle cases where the data is the response itself
  return data as T;
};

interface OrderStore {
  orders: OrderListResponse | null;
  order: Order | null;
  deliveryDetails: DeliveryDetails | null;
  loading: boolean;
  error: OrderError | null;
  storeError: OrderError | null;
  activeAction: string | null;

  // State setters
  setActiveAction: (action: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: OrderError | null) => void;
  setOrder: (order: Order | null) => void;
  setDeliveryDetails: (details: DeliveryDetails | null) => void;
  setOrders: (orders: OrderListResponse | null) => void;
  clearStore: () => void;

  // Order API methods
  fetchOrder: (id: string, headers?: Record<string, string>) => Promise<Order | null>;
  fetchOrderDeliveryDetails: (
    orderId: string,
    headers?: Record<string, string>
  ) => Promise<DeliveryDetails | null>;
  fetchOrders: (
    filter?: OrderFilter,
    headers?: Record<string, string>
  ) => Promise<OrderListResponse | null>;

  deleteOrder: (orderId: string, headers?: Record<string, string>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, headers?: Record<string, string>) => Promise<Order | null>;
  updatePaymentStatus: (
    id: string,
    paymentStatus: PaymentStatus,
    headers?: Record<string, string>
  ) => Promise<Order | null>;
  createRefund: (
    id: string,
    data: { amount: number; reason: string },
    headers?: Record<string, string>
  ) => Promise<Order | null>;
  assignDeliveryPartner: (
    payload: AssignDeliveryPayload,
    headers?: Record<string, string>
  ) => Promise<DeliveryDetails | null>;
  addDeliveryStage: (
    deliveryId: string,
    payload: AddDeliveryStagePayload,
    headers?: Record<string, string>
  ) => Promise<DeliveryDetails | null>;
}

export const useOrderStore = create<OrderStore>()((set, get) => ({
  orders: null,
  order: null,
  deliveryDetails: null,
  loading: false,
  error: null,
  storeError: null,
  activeAction: null,

  // State setters
  setActiveAction: (action) => set({ activeAction: action }),
  setLoading: (loading) => set({ loading }),
  setStoreError: (error) => set({ storeError: error }),
  setOrder: (order) => set({ order }),
  setDeliveryDetails: (details) => set({ deliveryDetails: details }),
  setOrders: (orders) => set({ orders }),

  clearStore: () =>
    set({
      order: null,
      deliveryDetails: null,
      storeError: null,
      loading: false,
      activeAction: null,
    }),

  // API Methods
  fetchOrders: async (
    filter: OrderFilter = {},
    headers?: Record<string, string>
  ) => {
    const { setActiveAction, setLoading, setStoreError, setOrders, loading } = get();
    
    // Prevent concurrent fetches
    if (loading) {
      return { items: [], total: 0, skip: 0, limit: 10 };
    }
    
    try {
      setActiveAction("fetchOrders");
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.skip) params.append("skip", filter.skip.toString());
      if (filter.limit) params.append("limit", filter.limit.toString());
      if (filter.search) params.append("query", filter.search);
      if (filter.status) params.append("status", filter.status);
      if (filter.userId) params.append("user_id", filter.userId);
      if (filter.vendorId) params.append("vendor_id", filter.vendorId);
      if (filter.dateFrom) params.append("date_from", filter.dateFrom);
      if (filter.dateTo) params.append("date_to", filter.dateTo);
      if (filter.has_ticket) params.append("has_ticket", "true");
      params.append("include_tickets", "true");

      const response = await apiClient.get<OrderApiResponse>(
        `/orders/?${params.toString()}`,
        undefined,
        headers
      );

      let orderList: OrderListResponse = {
        items: [],
        total: 0,
        skip: filter.skip || 0,
        limit: filter.limit || 10,
      };

      if (response.data && response.data.items) {
        const data = response.data;
        orderList = {
          ...data,
          items: data.items.map(order => ({
            ...order,
            status: (order.status?.toLowerCase() || order.status) as OrderStatus
          }))
        };
      }

      setOrders(orderList);
      setLoading(false);
      return orderList;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch orders";
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

  fetchOrder: async (id: string, headers?: Record<string, string>) => {
    const { setLoading, setStoreError, setOrder } = get();
    setLoading(true);
    setStoreError(null);
    try {
      // Check if the ID is a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      const endpoint = isUuid ? `/orders/${id}` : `/orders/number/${id}`;

      const response = await apiClient.get<ApiResponse<Order>>(endpoint, undefined, headers);
      const orderData = unwrapApiResponse<Order>(response);
      if (orderData) {
        const processedOrder: Order = {
          ...orderData,
          status: (orderData.status?.toLowerCase() || orderData.status) as OrderStatus
        };
        setOrder(processedOrder);
        return processedOrder;
      }
      throw new Error("Order data not found or in unexpected format");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || "Failed to fetch order";
      setStoreError({ message: errorMessage, status: error?.response?.status });
      setOrder(null);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  fetchOrderDeliveryDetails: async (orderId: string, headers?: Record<string, string>) => {
    const { setLoading, setStoreError, setDeliveryDetails } = get();
    setLoading(true);
    setStoreError(null);
    try {
      const response = await apiClient.get<ApiResponse<DeliveryDetails>>(
        `/deliveries/order/${orderId}`,
        undefined,
        headers
      );
      const deliveryData = unwrapApiResponse<DeliveryDetails>(response);
      if (deliveryData) {
        setDeliveryDetails(deliveryData);
        return deliveryData;
      }
      throw new Error("Delivery details not found");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || "Failed to fetch delivery details";
      setStoreError({ message: errorMessage, status: error?.response?.status });
      setDeliveryDetails(null);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus, headers?: Record<string, string>) => {
    const { order, orders, fetchOrder } = get();
    // Deep copy for safe rollback
    const originalOrder = order && order.order_id === orderId ? JSON.parse(JSON.stringify(order)) : null;
    const originalOrdersList = orders ? JSON.parse(JSON.stringify(orders)) : null;

    // Optimistic UI update
    set((state) => {
      let newOrders = null;
      if (state.orders && Array.isArray(state.orders.items)) {
        newOrders = {
          ...state.orders,
          items: state.orders.items.map((o: Order) =>
            o.order_id === orderId ? { ...o, status } : o
          ),
        };
      } else {
        newOrders = state.orders;
      }

      const newOrder =
        state.order && state.order.order_id === orderId
          ? { ...state.order, status }
          : state.order;

      return { ...state, orders: newOrders, order: newOrder, storeError: null };
    });

    try {
      const response = await apiClient.put<ApiResponse<Order>>(
        `/orders/${orderId}/status`,
        { status },
        headers
      );
      const updatedOrder = unwrapApiResponse<Order>(response);

      if (!updatedOrder) {
        throw new Error("Invalid response from server on status update.");
      }

      // API call was successful, confirm the changes
      set((state) => {
        const newOrders = state.orders
          ? {
            ...state.orders,
            items: state.orders.items.map((o) =>
              o.order_id === orderId ? updatedOrder : o
            ),
          }
          : null;
        const newOrder = state.order && state.order.order_id === orderId ? updatedOrder : state.order;
        return { ...state, order: newOrder, orders: newOrders };
      });

      return updatedOrder;
    } catch (error: any) {

      // Revert optimistic update on failure
      set({ order: originalOrder, orders: originalOrdersList, storeError: { message: "Failed to update status. Reverting changes." } });

      // Delayed re-fetch to ensure data consistency
      setTimeout(() => {
        fetchOrder(orderId, headers).catch(err => {
          set(state => ({ ...state, storeError: { message: "Failed to sync with server. Please refresh." } }))
        });
      }, 3000);

      throw error; // Re-throw to allow UI to handle it (e.g., show toast)
    }
  },

  updatePaymentStatus: async (id, paymentStatus, headers) => {
    const { setOrder, setOrders, orders } = get();
    try {
      const response = await apiClient.put<ApiResponse<Order>>(
        `/orders/${id}/payment-status`,
        { payment_status: paymentStatus },
        headers
      );
      const updatedOrder = unwrapApiResponse<Order>(response);
      if (updatedOrder) {
        setOrder(updatedOrder);
        if (orders) {
          const updatedItems = orders.items.map((o) =>
            o.order_id === id ? updatedOrder : o
          );
          setOrders({ ...orders, items: updatedItems });
        }
        return updatedOrder;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  },

  createRefund: async (id, data, headers) => {
    const { setOrder, setOrders, orders } = get();
    try {
      const response = await apiClient.post<ApiResponse<Order>>(
        `/orders/${id}/refunds`,
        data,
        headers
      );
      const updatedOrder = unwrapApiResponse<Order>(response);
      if (updatedOrder) {
        setOrder(updatedOrder);
        if (orders) {
          const updatedItems = orders.items.map((o) =>
            o.order_id === id ? updatedOrder : o
          );
          setOrders({ ...orders, items: updatedItems });
        }
        return updatedOrder;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  },

  assignDeliveryPartner: async (payload, headers) => {
    const { setOrder, setOrders, orders, setDeliveryDetails } = get();
    try {
      const response = await apiClient.post<ApiResponse<DeliveryDetails>>(
        `/deliveries/`,
        payload,
        headers
      );
      const details = unwrapApiResponse<DeliveryDetails>(response);
      if (details) {
        setDeliveryDetails(details);
        return details;
      } else {
        return null;
      }
    } catch (error: any) {
      throw error;
    }
  },

  addDeliveryStage: async (deliveryId, payload, headers) => {
    const { setDeliveryDetails } = get();
    try {
      const response = await apiClient.post<ApiResponse<DeliveryDetails>>(
        `/deliveries/${deliveryId}/stages`,
        payload,
        headers
      );
      const details = unwrapApiResponse<DeliveryDetails>(response);
      if (details) {
        setDeliveryDetails(details);
        return details;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  },

  deleteOrder: async (orderId, headers) => {
    const { setOrders, orders, setStoreError } = get();
    try {
      await apiClient.delete(`/orders/${orderId}`, undefined, headers);
      if (orders) {
        const updatedItems = orders.items.filter((o) => o.order_id !== orderId);
        setOrders({ ...orders, items: updatedItems });
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || "Failed to delete order";
      setStoreError({ message: errorMessage, status: error?.response?.status });
      throw error;
    }
  },
}));
