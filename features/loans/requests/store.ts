import { create } from 'zustand';
import {
  LoanRequest,
  LoanRequestFilter,
  LoanRequestListResponse,
  LoanRequestAction,
  LoanRequestError,
  ApiResponse,
  LoanRequestFormValues,
  PaymentSchedule,
  LoanDocument,
  VendorRevenue
} from './types';
import { apiClient } from '@/lib/api/client';
import {
  generateMockLoanRequests,
  generateMockPaymentSchedule,
  generateMockVendorRevenue
} from './data/mock-data';

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

        // Mock implementation
        const mockRequests = generateMockLoanRequests();
        const request = mockRequests.find(request => request.request_id === id);

        if (request) {
          setRequest(request);
          setLoading(false);
          return request;
        }

        throw new Error('Loan request not found');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch loan request';
        const errorStatus = (error as any)?.response?.status;
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

        // Mock implementation
        const mockRequests = generateMockLoanRequests();
        const vendorRequests = mockRequests.filter(request => request.vendor_id === vendorId);

        const requestResponse: LoanRequestListResponse = {
          items: vendorRequests,
          total: vendorRequests.length,
          skip: 0,
          limit: 10
        };

        setRequests(vendorRequests);
        setLoading(false);
        return requestResponse;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch vendor loan requests';
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

    fetchRequests: async (filter: LoanRequestFilter = {}, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, setRequests } = get();
      try {
        setActiveAction('fetchList');
        setLoading(true);

        // Mock implementation
        const mockRequests = generateMockLoanRequests();

        // Filter requests based on search params
        let filteredRequests = mockRequests;

        if (filter.search) {
          const search = filter.search.toLowerCase();
          filteredRequests = filteredRequests.filter(request =>
            (request.vendor_name && request.vendor_name.toLowerCase().includes(search)) ||
            (request.purpose && request.purpose.toLowerCase().includes(search)) ||
            (request.product_name && request.product_name.toLowerCase().includes(search))
          );
        }

        if (filter.status) {
          filteredRequests = filteredRequests.filter(request =>
            request.status === filter.status
          );
        }

        if (filter.vendor_id) {
          filteredRequests = filteredRequests.filter(request =>
            request.vendor_id === filter.vendor_id
          );
        }

        // Handle pagination
        const skip = filter.skip || 0;
        const limit = filter.limit || 10;
        const paginatedRequests = filteredRequests.slice(skip, skip + limit);

        const requestResponse: LoanRequestListResponse = {
          items: paginatedRequests,
          total: filteredRequests.length,
          skip,
          limit
        };

        setRequests(paginatedRequests);
        setLoading(false);
        return requestResponse;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch loan requests';
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

    updateRequestStatus: async (id: string, status: string, headers?: Record<string, string>, rejectionReason?: string) => {
      const { setActiveAction, setLoading, setStoreError, requests, setRequests, request, setRequest } = get();
      try {
        setActiveAction('updateStatus');
        setLoading(true);

        // Mock implementation
        const mockRequests = [...requests];
        const requestIndex = mockRequests.findIndex(r => r.request_id === id);

        if (requestIndex === -1) {
          throw new Error('Loan request not found');
        }

        const updatedRequest = {
          ...mockRequests[requestIndex],
          status: status as LoanRequest['status'],
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
          approved_at: status === 'approved' ? new Date().toISOString() : mockRequests[requestIndex].approved_at
        };

        mockRequests[requestIndex] = updatedRequest;
        setRequests(mockRequests);

        // If the current active request is the one being updated, also update it
        if (request && request.request_id === id) {
          setRequest(updatedRequest);
        }

        setLoading(false);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update loan request status';
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

    generatePaymentSchedule: async (amount: number, interestRate: number, termLength: number, paymentFrequency: string) => {
      const { setActiveAction, setLoading } = get();
      setActiveAction('generatePaymentSchedule');
      setLoading(true);

      // Mock implementation
      const mockSchedule = generateMockPaymentSchedule(amount, interestRate, termLength, paymentFrequency);

      setLoading(false);
      setActiveAction(null);
      return mockSchedule;
    },

    recordPayment: async (requestId: string, paymentId: string, amount: number, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, request, setRequest } = get();
      try {
        setActiveAction('recordPayment');
        setLoading(true);

        if (!request || request.request_id !== requestId || !request.payment_schedule) {
          throw new Error('Loan request not found or no payment schedule available');
        }

        const updatedPaymentSchedule = [...request.payment_schedule];
        const paymentIndex = updatedPaymentSchedule.findIndex(p => p.payment_id === paymentId);

        if (paymentIndex === -1) {
          throw new Error('Payment not found in schedule');
        }

        const payment = updatedPaymentSchedule[paymentIndex];
        const status = amount >= payment.amount ? 'paid' : 'partial';

        updatedPaymentSchedule[paymentIndex] = {
          ...payment,
          status,
          amount_paid: amount,
          payment_date: new Date().toISOString()
        };

        setRequest({
          ...request,
          payment_schedule: updatedPaymentSchedule,
          updated_at: new Date().toISOString()
        });

        setLoading(false);
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to record payment',
          status: (error as any)?.response?.status
        });
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    uploadRequestDocument: async (requestId: string, documents: LoanDocument[], headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, request, setRequest } = get();
      try {
        setActiveAction('uploadDocument');
        setLoading(true);

        if (!request || request.request_id !== requestId) {
          throw new Error('Loan request not found or not loaded');
        }

        const processedDocuments = documents.map(doc => ({
          ...doc,
          document_id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          submitted_at: new Date().toISOString()
        }));

        const currentDocuments = request.documents || [];

        setRequest({
          ...request,
          documents: [...currentDocuments, ...processedDocuments],
          updated_at: new Date().toISOString()
        });

        setLoading(false);
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to upload documents',
          status: (error as any)?.response?.status
        });
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    },

    addPenalty: async (requestId: string, penalty: { amount: number; reason: string }, headers?: Record<string, string>) => {
      const { setActiveAction, setLoading, setStoreError, request, setRequest } = get();
      try {
        setActiveAction('addPenalty');
        setLoading(true);

        if (!request || request.request_id !== requestId) {
          throw new Error('Loan request not found or not loaded');
        }

        const newPenalty = {
          penalty_id: `pen_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          amount: penalty.amount,
          reason: penalty.reason,
          applied_at: new Date().toISOString(),
          status: 'pending' as const
        };

        const currentPenalties = request.penalties || [];

        setRequest({
          ...request,
          penalties: [...currentPenalties, newPenalty],
          total_payable: request.total_payable + penalty.amount,
          remaining_balance: (request.remaining_balance || 0) + penalty.amount,
          updated_at: new Date().toISOString()
        });

        setLoading(false);
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to add penalty',
          status: (error as any)?.response?.status
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

        const mockRevenue = generateMockVendorRevenue(vendorId, period);

        set({ vendorRevenue: mockRevenue });
        setLoading(false);
        return mockRevenue;
      } catch (error: unknown) {
        setStoreError({
          message: error instanceof Error ? error.message : 'Failed to fetch vendor revenue',
          status: (error as any)?.response?.status
        });
        setLoading(false);
        throw error;
      } finally {
        setActiveAction(null);
      }
    }
  })
);
