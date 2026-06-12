import { TenantFormValues } from "./schema";

export type { TenantFormValues };

export type Banner = {
  title: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
};

export type TenantTheme = {
  logo: {
    primary: string | null;
    secondary: string | null;
    icon: string | null;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: {
      primary: string;
      secondary: string;
    };
    background: {
      primary: string;
      secondary: string;
    };
    border: string;
  };
};

export type TenantBranding = {
  logoUrl?: string | null;
  theme: TenantTheme;
};

export type TenantModules = Record<string, boolean>;

export type TenantMetadata = {
  terms_conditions?: string | null;
  privacy_policy?: string | null;
  banners?: Banner[] | null;
  support_phone?: string | null;
  support_email?: string | null;
};

export type User = {
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
};

export type Tenant = {
  tenant_id: string;
  user_id?: string;
  user: User;
  first_name?: string;
  last_name?: string;
  name: string;
  domain: string;
  country_code: string;
  currency: string;
  languages: string[];
  admin_email: string;
  admin_phone: string;
  is_active: boolean;
  fee?: string;
  trial_ends_at: string | null;
  plan: string | null;
  modules: TenantModules;
  branding: TenantBranding | null;
  banners: Banner[] | null;
  metadata: TenantMetadata;
  created_at: string;
  updated_at: string;
  billing_history: Array<{
    id: string;
    description: string;
    date: string;
    amount: number;
    status: string;
  }>;
};

export type TenantError = {
  status: number;
  message: string;
};

export type TenantListResponse = {
  items: Tenant[];
  total: number;
  skip: number;
  limit: number;
};

export type TenantFilter = {
  skip?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

export type TenantAction = 'fetch' | 'fetchList' | 'create' | 'update' | 'activate' | 'deactivate' | 'toggleModule';

export type BillingConfig = {
  config_id: string;
  tenant_id: string;
  flat_rate_amount: number;
  currency: string;
  billing_frequency: 'monthly' | 'annually';
  billing_email: string;
  auto_generate_invoices: boolean;
  email_notifications: boolean;
  billing_day_of_month: number;
  payment_due_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  invoice_id: string;
  tenant_id: string;
  config_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'pending_payment' | 'paid' | 'failed' | 'overdue';
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  billing_period_start: string;
  billing_period_end: string;
  description: string;
  notes: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceListResponse = {
  items: Invoice[];
  total: number;
  skip: number;
  limit: number;
};

export type BillingDashboardMetrics = {
  total_tenants: number;
  active_billing_configs: number;
  pending_invoices: number;
  overdue_invoices: number;
  total_pending_amount: number;
  total_overdue_amount: number;
  monthly_revenue: number;
  currency: string;
};