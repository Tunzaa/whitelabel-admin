// Generic API response type
export interface ApiResponse<T> {
    status: number;
    success: boolean;
    message?: string;
    data: T;
}

// From user payload
export type BankAccount = {
    bank_name: string;
    account_number: string;
    account_name: string;
    swift_code?: string;
    branch_code?: string;
};

// From user payload
export type VerificationDocument = {
    document_id?: string;
    document_type_id?: string;
    document_url: string;
    verification_status?: "pending" | "approved" | "rejected" | string;
    rejection_reason?: string | null;
    submitted_at?: string;
    expires_at?: string | null;
    verified_at?: string | null;
    document_type_name?: string;
    document_type_description?: string;
    number?: string; // <-- Added document number field
    // --- Fields for verification document status update response ---
    message?: string,
    vendor_id?: string,
    overall_vendor_status?: string,
    updated_at?: string
};

// From user payload
export type StoreBrandingColors = {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
};

// From user payload
export type StoreBranding = {
    logo_url: string;
    favicon_url?: string;
    colors: StoreBrandingColors;
};

// From user payload
export type StoreBanner = {
    title: string;
    image_url: string;
    alt_text: string;
    display_order: number;
};

// From user payload
export type Store = {
    store_id?: string;
    tenant_id?: string;
    vendor_id?: string;
    store_name: string;
    description?: string;
    branding?: StoreBranding;
    banners?: StoreBanner[];
    categories?: string[];
    general_policy?: string;
    return_policy?: string;
    shipping_policy?: string;
};

// From user payload
export type User = {
    user_id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
};

export type Location = {
    lat: number;
    long: number;
};

// Main Vendor type, combining everything
export type Vendor = {
    vendor_id?: string;
    id?: string; // sometimes vendor_id is aliased as id
    tenant_id: string;
    user_id?: string;
    business_name: string;
    display_name: string;
    policy?: string;
    contact_email: string;
    contact_phone: string;
    website?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state_province: string;
    postal_code: string;
    country: string;
    tax_id?: string;
    bank_account?: BankAccount;
    verification_documents?: VerificationDocument[];
    verification_status?: string;
    is_active?: boolean;
    commission_rate?: string;
    stores?: Store[];
    user?: User;
    location?: Location | [number, number] | null;
};

// The type for the form will be very similar to the Vendor type
export type VendorFormValues = Vendor;

// Error Type
export type VendorError = {
    status?: number;
    message: string;
};

// Types for store actions and filters
export type VendorAction = "fetchList" | "fetchOne" | "create" | "update" | "delete" | "updateStatus" | "fetchStore" | "fetchPerformance" | "updateDocumentStatus";

export interface VendorFilter {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    verification_status?: string;
}

export interface VendorListResponse {
    length: number;
    items: Vendor[];
    total: number;
    skip: number;
    limit: number;
}

// Ensure VendorApiResponse is defined to match the expected structure from fetchVendors
export type VendorApiResponse = VendorListResponse;


// Vendor reports
export interface VendorPerformanceData {
    performance_date: string;
    vendor_id: string;
    business_name: string;
    display_name: string;
    order_count: number;
    items_sold: number;
    vendor_gmv: number | null;
    avg_item_price: number | null;
    daily_gmv_rank: number;
    daily_order_rank: number;
}