import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { Transaction, TransactionStatus, TransactionsResponse } from './types';
import { ApiResponse } from '@/types/api';

interface TransactionState {
  transactions: Transaction[];
  currentTransaction: Transaction | null;
  loading: boolean;
  error: Error | null;
  total: number;
  limit: number;
  offset: number;
  fetchTransactions: (params?: {
    status?: TransactionStatus;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }, headers?: Record<string, string>) => Promise<void>;
  fetchTransaction: (transactionId: string, headers?: Record<string, string>) => Promise<Transaction | null>;
  setTransactions: (transactions: Transaction[]) => void;
  setCurrentTransaction: (transaction: Transaction | null) => void;
  setError: (error: Error | null) => void;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  currentTransaction: null,
  loading: false,
  error: null,
  total: 0,
  limit: 50,
  offset: 0,

  fetchTransactions: async (params = {}, headers = {}) => {
    set({ loading: true, error: null });
    try {
      const { status, search, dateFrom, dateTo, limit, offset } = params;
      const queryParams = new URLSearchParams();
      
      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);
      if (dateFrom) queryParams.append('date_from', dateFrom);
      if (dateTo) queryParams.append('date_to', dateTo);
      if (limit) queryParams.append('limit', limit.toString());
      if (offset) queryParams.append('offset', offset.toString());
      
      const queryString = queryParams.toString();
      const url = `/transactions/${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<ApiResponse<TransactionsResponse>>(url, undefined, headers);
      const responseData = response.data;
      
      set({
        transactions: responseData.data,
        total: responseData.total,
        limit: responseData.limit || 50,
        offset: responseData.offset || 0,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error('Failed to fetch transactions'),
        loading: false,
      });
    }
  },

  fetchTransaction: async (transactionId: string, headers = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<ApiResponse<Transaction>>(
        `/transactions/${transactionId}`,
        undefined,
        headers
      );
      
      const transaction = response.data.data;
      set({ currentTransaction: transaction, loading: false });
      return transaction;
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error(`Failed to fetch transaction ${transactionId}`),
        loading: false,
      });
      return null;
    }
  },

  fetchTransactionsByOrder: async (orderReference: string, headers = {}) => {
    set({ loading: true, error: null });
    try {
      interface OrderTransactionsResponse {
        data: Transaction[];
        total: number;
        limit: number;
        offset: number;
      }
      
      const response = await apiClient.get<ApiResponse<OrderTransactionsResponse>>(
        `/orders/${orderReference}/transactions`,
        undefined,
        headers
      );
      
      const responseData = response.data;
      
      set({
        transactions: responseData.data,
        total: responseData.total,
        limit: responseData.limit || 50,
        offset: responseData.offset || 0,
        loading: false,
      });
      
      return responseData.data;
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error(`Failed to fetch transactions for order ${orderReference}`),
        loading: false,
      });
      return [];
    }
  },

  setTransactions: (transactions) => set({ transactions }),
  setCurrentTransaction: (transaction) => set({ currentTransaction: transaction }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

export default useTransactionStore;