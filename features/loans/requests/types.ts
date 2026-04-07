// Types for loan requests
export type LoanRequestFormValues = {
  tenant_id: string;
  vendor_id?: string;
  borrower_id: string;
  product_id: string;
  amount_requested: number;
  loan_amount?: string;
  term_length?: number; // in months
  purpose: string;
  status?: string;
  notes?: string;
  payment_schedule?: PaymentSchedule[];
  documents?: LoanDocument[];
  // For responses/edit forms when we have a request ID
  request_id?: string;
  id?: string;
};

// Generic API response type
export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message?: string;
  data: T;
}

// Payment Schedule Type
export type PaymentSchedule = {
  payment_id: string;
  payment_number?: number;
  due_date: string;
  amount: number;
  principal: number;
  interest: number;
  remaining_balance?: number;
  status: 'pending' | 'paid' | 'upcoming' | 'overdue' | 'partial';
  payment_date?: string;
  amount_paid?: number;
};

// Loan Document Type
export type LoanDocument = {
  id?: string;                                      // Internal ID (not sent to API)
  document_id?: string;                             // For existing documents from API
  document_type: string;                            // REQUIRED: Type of document
  document_url: string;                             // REQUIRED: URL to the document
  file_name?: string;                              // Optional: For display purposes only
  file_size?: number;                              // Optional: Size in bytes
  mime_type?: string;                              // Optional: MIME type
  submitted_at?: string;                           // When document was submitted
  file?: File;                                     // File object for upload (not sent to API)
  file_id?: string;                                // Internal file ID
};

// VendorRevenue Type - used for displaying vendor revenue information
export type VendorRevenue = {
  vendor_id: string;
  period: string; // 'weekly', 'monthly'
  amount: number;
  transaction_count: number;
  start_date: string;
  end_date: string;
  growth_percentage?: number;
};

export type LoanPenalty = {
  penalty_id: string;
  amount: number;
  reason: string;
  applied_at: string;
  status: 'pending' | 'paid' | 'waived';
  paid_at?: string;
};

// Loan Request entity type
export type LoanRequest = {
  _id?: string;
  id?: string;
  request_id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_contact?: string;
  vendor_email?: string;
  product_id: string;
  product_name?: string;
  provider_id?: string;
  provider_name?: string;
  loan_amount: number;
  interest_rate: number;
  payment_frequency: 'weekly' | 'bi-weekly' | 'monthly';
  term_length: number; // in months
  total_payable: number;
  remaining_balance?: number;
  processing_fee?: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted' | 'disbursed' | 'paid';
  rejection_reason?: string;
  notes?: string;
  payment_schedule?: PaymentSchedule[];
  documents?: LoanDocument[];
  penalties?: LoanPenalty[];
  approved_by?: string;
  approved_at?: string;
  disbursed_at?: string;
  disbursed_by?: string;
  paid_at?: string;
  created_at?: string;
  updated_at?: string;
};

// Error Type
export type LoanRequestError = {
  status?: number;
  message: string;
};

// List Response Types
export type LoanRequestListResponse = {
  items: LoanRequest[];
  total: number;
  skip: number;
  limit: number;
};

// API Raw Response type that matches the actual API response format
export interface LoanRequestApiResponse {
  items: LoanRequest[];
  total: number;
  skip: number;
  limit: number;
}

// Filter Types
export interface LoanRequestFilter {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  vendor_id?: string;
  product_id?: string;
  provider_id?: string;
  min_amount?: number;
  max_amount?: number;
  start_date?: string;
  end_date?: string;
}

// Action Types
export type LoanRequestAction =
  | 'fetchList'
  | 'fetchOne'
  | 'fetchDetailedLoan'
  | 'create'
  | 'update'
  | 'updateStatus'
  | 'fetchByVendor'
  | 'generatePaymentSchedule'
  | 'recordPayment'
  | 'uploadDocument'
  | 'fetchVendorRevenue'
  | 'addPenalty';

export type LoanRepayment = {
  repayment_id: string;
  loan_id: string;
  schedule_id: string | null;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  reference_number?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'SUCCESS';
  created_at: string;
};

export type LoanSchedule = {
  schedule_id: string;
  loan_id: string;
  installment_number: number;
  principal_due: number;
  interest_due: number;
  fees_due: number;
  amount_due: number;
  due_date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  created_at: string;
};

export type DetailedLoan = {
  loan_id: string;
  request_id: string;
  borrower_id: string;
  principal_amount: number;
  total_expected_interest: number;
  total_fees: number;
  outstanding_balance: number;
  disbursement_status: string;
  disbursed_at: string;
  status: string;
  created_at: string;
  updated_at: string;
  schedules: LoanSchedule[];
  repayments: LoanRepayment[];
};
