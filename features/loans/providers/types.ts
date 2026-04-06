// Types for loan providers
export type LoanProviderFormValues = {
  tenant_id: string;
  user_id?: string;
  business_name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  website?: string;
  address?: string;
  is_active: boolean;
  integration_key?: string;
  integration_secret?: string;
  // For responses/edit forms when we have a provider ID
  provider_id?: string;
  id?: string;
};

// Generic API response type
export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message?: string;
  data: T;
}

// Verification Document Type
export type VerificationDocument = {
  id?: string;                                      // Internal ID (not sent to API)
  document_id?: string;                             // For existing documents from API
  document_type: string;                            // REQUIRED: Type of document
  document_url: string;                             // REQUIRED: URL to the document
  file_name?: string;                              // Optional: For display purposes only
  file_size?: number;                              // Optional: Size in bytes
  mime_type?: string;                              // Optional: MIME type
  expires_at?: string;                             // Optional: Expiration date
  verification_status?: "pending" | "approved" | "rejected"; // Status
  rejection_reason?: string;                       // Reason if rejected
  submitted_at?: string;                           // When document was submitted
  verified_at?: string;                            // When document was verified
  file?: File;                                     // File object for upload (not sent to API)
  file_id?: string;                                // Internal file ID
};

// Loan Provider entity type
export type LoanProvider = {
  provider_id: string;
  tenant_id: string;
  user_id: string;
  business_name: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  status?: string;
  name?: string;
  description?: string;
  website?: string;
  address?: string;
  logo_url?: string;
  integration_key?: string;
  integration_secret?: string;
  api_endpoint?: string;
  verification_documents?: VerificationDocument[];
  statistics?: {
    total_loans?: number;
    loan_growth?: number;
    avg_loan_value?: string;
    repayment_rate?: number;
  };
  created_at?: string;
  updated_at?: string;
};

// Error Type
export type LoanProviderError = {
  status?: number;
  message: string;
};

// List Response Types
export type LoanProviderListResponse = {
  items: LoanProvider[];
  total: number;
  skip: number;
  limit: number;
};

// API Raw Response type that matches the actual API response format
export interface LoanProviderApiResponse {
  items: LoanProvider[];
  total: number;
  skip: number;
  limit: number;
}

// Filter Types
export interface LoanProviderFilter {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

// Action Types
export type LoanProviderAction = 
  | 'fetchList'
  | 'fetchOne'
  | 'create'
  | 'update'
  | 'updateStatus';
