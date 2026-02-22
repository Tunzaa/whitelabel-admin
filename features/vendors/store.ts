import { create } from "zustand";
import {
  Vendor,
  VendorFilter,
  VendorListResponse,
  VendorAction,
  VendorError,
  Store,
  VerificationDocument,
  ApiResponse,
  StoreBranding,
  StoreBanner,
  VendorApiResponse,
  VendorPerformanceData,
} from "./types";
import { apiClient } from "@/lib/api/client";

interface VendorStore {
  vendors: VendorListResponse;
  vendor: Vendor | null;
  store: Store | null;
  loading: boolean;
  error: VendorError | null;
  activeAction: VendorAction | null;
  setActiveAction: (action: VendorAction | null) => void;
  setLoading: (loading: boolean) => void;
  setVendor: (vendor: Vendor | null) => void;
  setVendors: (vendors: VendorApiResponse) => void;
  setStore: (store: Store | null) => void;
  setError: (error: VendorError | null) => void;
  fetchVendor: (
    id: string,
    headers?: Record<string, string>
  ) => Promise<Vendor>;
  fetchVendors: (
    filter?: VendorFilter,
    headers?: Record<string, string>
  ) => Promise<VendorListResponse>;
  createVendor: (
    data: Partial<Vendor>,
    headers?: Record<string, string>
  ) => Promise<Vendor>;
  updateVendor: (
    id: string,
    data: Partial<Vendor>,
    headers?: Record<string, string>
  ) => Promise<Vendor>;
  updateVendorStatus: (
    id: string,
    status: string,
    headers?: Record<string, string>,
    rejection_reason?: string
  ) => Promise<void>;
  // Store related actions
  fetchStoreByVendor: (
    vendorId: string,
    headers?: Record<string, string>,
    limit?: number
  ) => Promise<Store[]>;
  updateStore: (
    id: string,
    data: Partial<Store>,
    headers?: Record<string, string>,
  ) => Promise<Store>;
  updateVendorDocumentStatus: (
    vendorId: string,
    payload: {
      document_id: string;
      verification_status: "verified" | "rejected";
      rejection_reason?: string;
    },
    headers?: Record<string, string>
  ) => Promise<VerificationDocument>;
  vendorPerformanceReport: VendorPerformanceData[];
  fetchVendorPerformanceReport: (
    vendorId: string,
    headers?: Record<string, string>
  ) => Promise<void>;
}

export const useVendorStore = create<VendorStore>()((set, get) => ({
  vendors: { items: [], total: 0, skip: 0, limit: 10 },
  vendor: null,
  store: null,
  loading: false,
  error: null,
  activeAction: null,
  vendorPerformanceReport: [],

  setActiveAction: (action) => set({ activeAction: action }),
  setLoading: (loading) => set({ loading }),
  setVendor: (vendor: Vendor | null) => set({ vendor }),
  setVendors: (vendors: VendorApiResponse) => set({ vendors }),
  setError: (error) => set({ error: error }),
  setStore: (store: Store | null) => set({ store }),

  fetchVendor: async (id: string, headers?: Record<string, string>) => {
    const { setActiveAction, setLoading, setError, setVendor, loading } = get();
    
    // Prevent concurrent fetches
    if (loading) {
      return null as any;
    }
    
    try {
      setActiveAction("fetchOne");
      setLoading(true);
      const response = await apiClient.get<any>(
        `/marketplace/vendors/${id}`,
        undefined,
        headers
      );


      // Try multiple possible response structures
      let vendorData = null;

      // Option 1: response.data.data structure
      if (response.data && response.data.data) {
        vendorData = response.data.data;
      }
      // Option 2: response.data structure (direct)
      else if (response.data) {
        vendorData = response.data;
      }

      // Check if we found vendor data and it has the expected properties
      if (
        vendorData &&
        (vendorData.business_name || vendorData.vendor_id || vendorData._id)
      ) {
        // Ensure we have vendor_id
        if (!vendorData.vendor_id && vendorData._id) {
          vendorData.vendor_id = vendorData._id;
        }

        // Clean up verification status to be lowercase
        if (
          vendorData.verification_status &&
          typeof vendorData.verification_status === "string"
        ) {
          vendorData.verification_status =
            vendorData.verification_status.toLowerCase();
        }

        setVendor(vendorData as Vendor);
        setLoading(false);
        return vendorData as Vendor;
      }

      setLoading(false);
      throw new Error("Vendor data not found or in unexpected format");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch vendor";
      const errorStatus = (error as any)?.response?.status;
      setError({
        message: errorMessage,
        status: errorStatus,
      });
      setVendor(null);
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  fetchVendors: async (
    filter: VendorFilter = {},
    headers?: Record<string, string>
  ) => {
    const { setActiveAction, setLoading, setError, setVendors } = get();
    try {
      setActiveAction("fetchList");
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.skip) params.append("skip", filter.skip.toString());
      if (filter.limit) params.append("limit", filter.limit.toString());
      if (filter.search) params.append("search", filter.search);
      if (filter.verification_status)
        params.append("verification_status", filter.verification_status);
      if (filter.is_active !== undefined)
        params.append("is_active", filter.is_active.toString());

      const response = await apiClient.get<VendorListResponse>(
        `/marketplace/vendors?${params.toString()}`,
        undefined,
        headers
      );

      const responseData = response.data as unknown as VendorListResponse;

      if (responseData && responseData.items) {
        const cleanedItems = responseData.items.map((vendor: Vendor) => ({
          ...vendor,
          verification_status:
            vendor.verification_status &&
              typeof vendor.verification_status === "string"
              ? vendor.verification_status.toLowerCase()
              : vendor.verification_status,
        }));

        const cleanedResponseData: VendorListResponse = {
          items: cleanedItems,
          total: responseData.total,
          skip: responseData.skip,
          limit: responseData.limit,
        };

        setVendors(cleanedResponseData);
        setLoading(false);
        return cleanedResponseData;
      }

      const emptyResult: VendorListResponse = {
        items: [],
        total: 0,
        skip: filter.skip || 0,
        limit: filter.limit || 10,
      };

      setVendors(emptyResult);
      setLoading(false);
      return emptyResult;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch vendors";
      const errorStatus = (error as any)?.response?.status;
      setError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  createVendor: async (
    data: Partial<Vendor>,
    headers?: Record<string, string>
  ) => {
    const { setActiveAction, setLoading, setError } = get();
    try {
      setActiveAction("create");
      setLoading(true);
      const response = await apiClient.post<ApiResponse<Vendor>>(
        "/marketplace/vendors",
        data,
        headers
      );

      let vendorData = null;
      if (response.data && response.data.data) {
        vendorData = response.data.data;
      } else if (response.data) {
        vendorData = response.data as any;
      }

      if (vendorData) {
        // Clean up verification status to be lowercase
        if (
          vendorData.verification_status &&
          typeof vendorData.verification_status === "string"
        ) {
          vendorData.verification_status =
            vendorData.verification_status.toLowerCase();
        }
        // Refetch vendors list to include the new one
        get().fetchVendors({}, headers);
        return vendorData as Vendor;
      }

      throw new Error("Failed to create vendor");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create vendor";
      const errorStatus = (error as any)?.response?.status;
      setError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  updateVendor: async (
    id: string,
    data: Partial<Vendor>,
    headers?: Record<string, string>
  ) => {
    const { setActiveAction, setLoading, setError, setVendor } = get();
    try {
      setActiveAction("update");
      setLoading(true);

      const response = await apiClient.put<any>(
        `/marketplace/vendors/${id}`,
        data,
        headers
      );

      let vendorData = null;
      if (response.data && response.data.data) {
        vendorData = response.data.data;
      } else if (response.data) {
        vendorData = response.data;
      }

      if (vendorData && (vendorData.vendor_id || vendorData._id || vendorData.id)) {
        if (!vendorData.vendor_id && (vendorData._id || vendorData.id)) {
          vendorData.vendor_id = vendorData._id || vendorData.id;
        }
        // Clean up verification status to be lowercase
        if (
          vendorData.verification_status &&
          typeof vendorData.verification_status === "string"
        ) {
          vendorData.verification_status =
            vendorData.verification_status.toLowerCase();
        }
        setVendor(vendorData as Vendor);
        setLoading(false);
        return vendorData as Vendor;
      }

      throw new Error("Failed to update vendor: Invalid API response");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update vendor";
      const errorStatus = (error as any)?.response?.status;
      setError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  updateVendorStatus: async (
    id: string,
    status: string,
    headers?: Record<string, string>,
    rejection_reason?: string,
    is_active?: boolean
  ) => {
    const { setActiveAction, setLoading, setError } = get();
    try {
      setActiveAction("updateStatus");
      setLoading(true);

      let payload: Record<string, any> = {};

      // Handle different cases based on status and is_active
      if (status === "active" || status === "inactive") {
        // For activate/deactivate actions, set is_active and maintain approved status
        payload = { is_active: status === "active", status: "approved" };
      } else if (status === "approved") {
        // For approval, set status to approved and is_active to false
        payload = { status: "approved", is_active: false };
      } else if (status === "rejected" && rejection_reason) {
        // For rejection, include rejection_reason and set is_active to false
        payload = { status: "rejected", rejection_reason, is_active: false };
      } else {
        // For any other status updates, use as provided
        payload = { status };

        // Include is_active if explicitly provided
        if (typeof is_active === "boolean") {
          payload.is_active = is_active;
        }
      }

      await apiClient.put(
        `/marketplace/vendors/${id}/status`,
        payload,
        headers
      );
      setLoading(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update vendor status";
      const errorStatus = (error as any)?.response?.status;
      setError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  // Store related methods
  fetchStoreByVendor: async (
    vendorId: string,
    headers?: Record<string, string>,
    limit?: number
  ): Promise<Store[]> => {
    const { setActiveAction, setLoading, setError } = get();
    try {
      setActiveAction("fetchStore");
      setLoading(true);

      // Create params object with vendor_id and limit
      const params = {
        vendor_id: vendorId, // Include vendor_id in the request body
        ...(limit ? { limit } : {}),
      };

      // Make the API call with the correct endpoint and parameter order
      // 1. URL endpoint for stores
      // 2. Query params with vendor_id and limit
      // 3. Headers as the third parameter
      const response = await apiClient.get(
        "/marketplace/stores",
        params,
        headers
      );


      if (response.status === 200) {
        const responseData = response.data as any; // Cast to any to handle various response structures

        // Case 1: Response has items array (pagination structure)
        if (
          responseData &&
          responseData.items &&
          Array.isArray(responseData.items)
        ) {
          const storesData = responseData.items as Store[];
          return storesData;
        }

        // Case 2: Response is already an array of stores
        if (responseData && Array.isArray(responseData)) {
          return responseData as Store[];
        }

        // Case 3: Response is a single store object (not in an array)
        if (
          responseData &&
          typeof responseData === "object" &&
          !Array.isArray(responseData)
        ) {
          // Check if it has store-like properties
          if ("_id" in responseData || "store_name" in responseData) {
            return [responseData as Store];
          }
        }

        // Case 4: Unknown structure but has some data - try to use it
        if (responseData) {
          return Array.isArray(responseData)
            ? (responseData as Store[])
            : [responseData as Store];
        }

        // Default: No valid data found
        return [];
      }

      // If API call was not successful
      return [];
    } catch (error: any) {
      setError({
        message: error.message || "Failed to fetch store by vendor ID",
        status: error.response?.status,
      });
      throw error;
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  },

  // New: Update store by ID
  updateStore: async (
    id: string,
    data: Partial<Vendor>,
    headers?: Record<string, string>
  ) => {
    const { setActiveAction, setLoading, setError, setStore } = get();
    try {
      setActiveAction("update");
      setLoading(true);

      // The API now accepts a unified payload, so we send the data directly.
      const response = await apiClient.put<any>(
        `/marketplace/stores/${id}`,
        data,
        headers
      );

      let storeData = null;
      if (response.data && response.data.data) {
        storeData = response.data.data;
      } else if (response.data) {
        storeData = response.data;
      }

      if (storeData) {
        setStore(storeData as Store);
        setLoading(false);
        return storeData as Store;
      }

      throw new Error("Failed to update store: Invalid API response");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update store";
      const errorStatus = (error as any)?.response?.status;
      setError({
        message: errorMessage,
        status: errorStatus,
      });
      setLoading(false);
      throw error;
    } finally {
      setActiveAction(null);
    }
  },

  fetchVendorPerformanceReport: async (
    vendorId: string,
    headers?: Record<string, string>
  ): Promise<void> => {
    const { setLoading, setError, setActiveAction } = get();
    setLoading(true);
    setActiveAction("fetchPerformance");
    try {
      const response = await apiClient.get<ApiResponse<VendorPerformanceData[]>>(
        `/reports/vendor-performance?vendor_id=${vendorId}`,
        undefined,
        headers
      );
      const performanceData = response.data?.data || [];
      set({ vendorPerformanceReport: performanceData });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch performance data";
      setError({ message: errorMessage });
      set({ vendorPerformanceReport: [] });
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  },

  updateVendorDocumentStatus: async (
    vendorId: string,
    payload: {
      document_id: string;
      verification_status: "verified" | "rejected";
      rejection_reason?: string;
    },
    headers?: Record<string, string>
  ): Promise<VerificationDocument> => {
    const { setActiveAction, setLoading, setError, setVendor, vendor } = get();
    setActiveAction("updateDocumentStatus");
    setLoading(true);

    try {
      const { document_id, ...apiPayload } = payload;

      const response = await apiClient.put<ApiResponse<VerificationDocument>>(
        `/marketplace/vendors/${vendorId}/documents/${document_id}/status`,
        apiPayload,
        headers
      );

      const updatedDocument = response.data as unknown as VerificationDocument | undefined;

      // Determine if the call succeeded purely from HTTP status.
      const isSuccess = response.status >= 200 && response.status < 300;

      if (!isSuccess) {
        throw new Error(
          response.data?.message || "Failed to update document status"
        );
      }

      // Build a document object even if backend did not send one.
      let finalDoc: VerificationDocument | undefined = updatedDocument;
      if (!finalDoc && vendor && vendor.verification_documents) {
        const existing = vendor.verification_documents.find(
          (d) => d.document_id === payload.document_id
        );
        if (existing) {
          finalDoc = {
            ...existing,
            verification_status: payload.verification_status,
            rejection_reason: payload.rejection_reason ?? null,
          };
        }
      }

      // Update local cache for immediate UI feedback.
      if (vendor && vendor.verification_documents) {
        const patched = vendor.verification_documents.map((d) =>
          d.document_id === payload.document_id
            ? {
              ...d,
              ...(finalDoc || {}),
              verification_status: payload.verification_status,
              rejection_reason: payload.rejection_reason ?? null,
            }
            : d
        );
        setVendor({ ...vendor, verification_documents: patched });
      }

      // Fallback minimal object so caller resolves successfully.
      if (!finalDoc) {
        finalDoc = {
          document_id: payload.document_id,
          document_url: "",
          verification_status: payload.verification_status,
          rejection_reason: payload.rejection_reason ?? null,
        } as VerificationDocument;
      }

      return finalDoc;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An unknown error occurred";
      setError({ message: errorMessage, status: error.response?.status });
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  },
}));
