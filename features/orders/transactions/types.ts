// Transaction types for order transactions

// Generic API response type
export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message?: string;
  data: T;
}

// Transaction Status
export type TransactionStatus = 
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

// Transaction entity type
export interface Transaction {
  id: string;
  transaction_id: string;
  reference: string;
  amount: number;
  status: TransactionStatus;
  payment_date: string | null;
  user_id: string;
  tenant_id: string;
  type?: string;
  raw_request?: Record<string, any>;
  raw_response?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Response types
export interface TransactionsResponse {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface SingleTransactionResponse {
  data: Transaction;
  message: string;
}

// Error Type
export interface TransactionError {
  status?: number;
  message: string;
}

// Filter Types
export interface TransactionFilter {
  status?: TransactionStatus;
  search?: string;
  from_date?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
