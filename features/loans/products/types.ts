// Types for loan products
export type LoanProductFormValues = {
  provider_id: string;
  name: string;
  interest_rate: number;
  interest_period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interest_rate_type: 'FLAT' | 'REDUCING' | 'REDUCING_BALANCE';
  term_duration: number;
  term_unit: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  repayment_frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
  charges: Record<string, any>;
  min_amount?: number;
  max_amount?: number;
  processing_fee?: number;
  description?: string;
  is_active?: boolean;
  tenant_id?: string;
  // For responses/edit forms when we have a product ID
  product_id?: string;
  id?: string;
};

// Generic API response type
export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message?: string;
  data: T;
}

// Loan Product entity type
export type LoanProduct = {
  _id?: string;
  id?: string;
  product_id: string;
  tenant_id?: string;
  provider_id: string;
  provider_name?: string;
  name: string;
  description?: string;
  interest_rate: number;
  interest_period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interest_rate_type: 'FLAT' | 'REDUCING' | 'REDUCING_BALANCE';
  term_duration: number;
  term_unit: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  repayment_frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
  min_amount?: number;
  max_amount?: number;
  status?: string;
  processing_fee?: number;
  charges: Record<string, any>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

// Error Type
export type LoanProductError = {
  status?: number;
  message: string;
};

// List Response Types
export type LoanProductListResponse = {
  items: LoanProduct[];
  total: number;
  skip: number;
  limit: number;
};

// API Raw Response type that matches the actual API response format
export interface LoanProductApiResponse {
  items: LoanProduct[];
  total: number;
  skip: number;
  limit: number;
}

// Filter Types
export interface LoanProductFilter {
  skip?: number;
  limit?: number;
  search?: string;
  provider_id?: string;
  is_active?: boolean;
  min_interest_rate?: number;
  max_interest_rate?: number;
}

// Action Types
export type LoanProductAction =
  | 'fetchList'
  | 'fetchOne'
  | 'create'
  | 'update'
  | 'updateStatus';
