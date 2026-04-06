import { create } from 'zustand';
import {
  LoanRequest,
  LoanRequestFilter,
  LoanRequestListResponse,
  LoanRequestAction,
  LoanRequestError,
  PaymentSchedule,
  LoanDocument,
  VendorRevenue
} from './types';
import { apiClient } from '@/lib/api/client';

interface LoanRequestStore {
  requests: LoanRequest[];
  request: LoanRequest | null;
  vendorRevenue: VendorRevenue | null;
  loading: boolean;
  storeError: LoanRequestError | null;
  activeAction: LoanRequestAction | null;

  // UI State
  setActiveAction: (action: LoanRequestAction | null) => void;
  setLoading: (loading: boolean) => void;
  setStoreError: (error: LoanRequestError | null) => void;
  setRequest: (request: LoanRequest | null) => void;
  setRequests: (requests: LoanRequest[]) => void;

  // API Methods
  fetchRequest: (id: string, headers?: Record<string, string>) => Promise<LoanRequest>;
  fetchRequestsByVendor: (vendorId: string, headers?: Record<string, string>) => Promise<LoanRequestListResponse>;
  fetchRequests: (filter?: LoanRequestFilter, headers?: Record<string, string>) => Promise<LoanRequestListResponse>;
  updateRequestStatus: (id: string, status: string, headers?: Record<string, string>, rejectionReason?: string) => Promise<void>;

  // Payment and vendor methods
  generatePaymentSchedule: (amount: number, interestRate: number, termLength: number, paymentFrequency: string) => Promise<PaymentSchedule[]>;
  recordPayment: (requestId: string, paymentId: string, amount: number, headers?: Record<string, string>) => Promise<void>;
  submitRepayment: (loanId: string, amount: number, method: string, headers?: Record<string, string>) => Promise<void>;
  disburseLoan: (loanId: string, headers?: Record<string, string>) => Promise<void>;
  uploadRequestDocument: (requestId: string, documents: LoanDocument[], headers?: Record<string, string>) => Promise<void>;
  addPenalty: (requestId: string, penalty: { amount: number; reason: string }, headers?: Record<string, string>) => Promise<void>;
  fetchVendorRevenue: (vendorId: string, period: string, headers?: Record<string, string>) => Promise<VendorRevenue>;
}

export const useLoanRequestStore = create<LoanRequestStore>()(
  (set, get) => ({
    requests: [],
    request: null,
    vendorRevenue: null,
    loading: false,
    storeError: null,
    activeAction: null,

    setActiveAction: (action) => set({ activeAction: action }),
    setLoading: (loading) => set({ loading }),
    setStoreError: (error) => set({ storeError: error }),
    setRequest: (request) => set({ request }),
    setRequests: (requests) => set({ requests }),

    fetchRequest: async (id: string, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setRequest } = get();
      try {
        setActiveAction('fetchOne');
        setLoading(true);

        const response = await apiClient.get<LoanRequest>(`/loans/requests/${id}`, undefined, headers);
        const request = response.data.data;

        setRequest(request);
        setLoading(false);
        return request;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch loan request';
        const errorStatus = (error as { response?: { status?: number } })?.response?.status;
        setStoreError({
          message: errorMessage,
          status: errorStatus,
        });
        setRequest(null);
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    fetchRequestsByVendor: async (vendorId: string, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setRequests } = get();
      try {
        setActiveAction('fetchByVendor');
        setLoading(true);

        const response = await apiClient.get<LoanRequest[]>(`/loans/borrower/${vendorId}`, undefined, headers);
        const vendorRequests = response.data.data;

        const requestResponse: LoanRequestListResponse = {
          items: vendorRequests,
          total: vendorRequests.length,
          skip: 0,
          limit: vendorRequests.length
        };

        setRequests(vendorRequests);
        setLoading(false);
        return requestResponse;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch vendor loan requests';
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

    fetchRequests: async (filter: LoanRequestFilter = {}, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setRequests } = get();
      try {
        setActiveAction('fetchList');
        setLoading(true);

        const response = await apiClient.get<LoanRequest[]>('/loans/requests', filter, headers);
        const requestList = response.data.data;

        const requestResponse: LoanRequestListResponse = {
          items: requestList,
          total: requestList.length,
          skip: filter.skip || 0,
          limit: filter.limit || 10
        };

        setRequests(requestList);
        setLoading(false);
        return requestResponse;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch loan requests';
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

    updateRequestStatus: async (id: string, status: string, headers?: Record<string, string>, rejectionReason?: string) => {
      const { setActiveAction, setLoading, setStoreError, requests, setRequests, request, setRequest } = get();
      try {
        setActiveAction('updateStatus');
        setLoading(true);

        let response;
        if (status === 'approved') {
          response = await apiClient.post<LoanRequest>(`/loans/requests/${id}/approve`, undefined, headers);
        } else {
          // Reject or other status updates
          response = await apiClient.patch<LoanRequest>(`/loans/requests/${id}/status`, { status, rejection_reason: rejectionReason }, headers);
        }
        
        const updatedRequest = response.data.data;

        const updatedRequests = requests.map(r => r.request_id === id ? updatedRequest : r);
        setRequests(updatedRequests);

        if (request && request.request_id === id) {
          setRequest(updatedRequest);
        }

        setLoading(false);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update loan request status';
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

    generatePaymentSchedule: async (amount: number, interestRate: number, termLength: number, paymentFrequency: string) => {
      const { setActiveAction, setLoading } = get();
      try {
        setActiveAction('generatePaymentSchedule');
        setLoading(true);

        const response = await apiClient.post<PaymentSchedule[]>('/loans/tools/calculate-schedule', {
          amount,
          interest_rate: interestRate,
          term_length: termLength,
          payment_frequency: paymentFrequency
        });

        const schedule = response.data.data;
        setLoading(false);
        return schedule;
      } catch (error) {
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    recordPayment: async (requestId: string, paymentId: string, amount: number, headers?: Record<string, string>) => {
      // Mapping recordPayment to submitRepayment for consistency with Postman
      const { submitRepayment } = get();
      return submitRepayment(requestId, amount, 'm-pesa', headers);
    },

    submitRepayment: async (loanId: string, amount: number, method: string, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, fetchRequest } = get();
      try {
        setActiveAction('recordPayment');
        setLoading(true);

        await apiClient.post(`/loans/${loanId}/repayments`, { amount, method }, headers);
        
        // Refresh request data after repayment
        await fetchRequest(loanId, headers);

        setLoading(false);
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to record payment',
          status: (error as { response?: { status?: number } })?.response?.status
        });
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    disburseLoan: async (loanId: string, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, fetchRequest } = get();
      try {
        setActiveAction('updateStatus');
        setLoading(true);

        await apiClient.post(`/loans/${loanId}/disburse`, undefined, headers);
        
        // Refresh request data after disbursement
        await fetchRequest(loanId, headers);

        setLoading(false);
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to disburse loan',
          status: (error as { response?: { status?: number } })?.response?.status
        });
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    uploadRequestDocument: async (requestId: string, documents: LoanDocument[], headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, fetchRequest } = get();
      try {
        setActiveAction('uploadDocument');
        setLoading(true);

        // This would likely be a multipart form upload in a real app
        // For now, mapping to an API endpoint if it exists
        await apiClient.post(`/loans/requests/${requestId}/documents`, { documents }, headers);
        
        await fetchRequest(requestId, headers);

        setLoading(false);
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to upload documents',
          status: (error as { response?: { status?: number } })?.response?.status
        });
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    addPenalty: async (requestId: string, penalty: { amount: number; reason: string }, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, fetchRequest } = get();
      try {
        setActiveAction('addPenalty');
        setLoading(true);

        await apiClient.post(`/loans/requests/${requestId}/penalties`, penalty, headers);
        
        await fetchRequest(requestId, headers);

        setLoading(false);
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to add penalty',
          status: (error as { response?: { status?: number } })?.response?.status
        });
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    fetchVendorRevenue: async (vendorId: string, period: string, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError } = get();
      try {
        setActiveAction('fetchVendorRevenue');
        setLoading(true);

        const response = await apiClient.get<VendorRevenue>(`/vendors/${vendorId}/revenue`, { period }, headers);
        const revenue = response.data.data;

        set({ vendorRevenue: revenue });
        setLoading(false);
        return revenue;
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to fetch vendor revenue',
          status: (error as { response?: { status?: number } })?.response?.status
        });
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    }
  })
);
