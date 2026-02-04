import { LoanProvider } from '../types';

// Generate mock loan providers
export function generateMockLoanProviders(): LoanProvider[] {
  return [
    {
      provider_id: 'provider_1',
      tenant_id: 'tenant_1',
      name: 'DCB Bank',
      description: 'DCB Bank provides flexible financing options for small and medium vendors with competitive rates.',
      contact_email: 'contact@dcb.com',
      contact_phone: '+255712345678',
      website: 'https://dcb.com',
      address: 'Plot 123, Kinondoni Street, Dar es Salaam, Tanzania',
      is_active: true,
      integration_key: 'dcb_api_key',
      integration_secret: 'dcb_api_secret',
      created_at: '2025-01-15T10:30:00Z',
      updated_at: '2025-01-15T10:30:00Z'
    },
    // {
    //   provider_id: 'provider_2',
    //   tenant_id: 'tenant_1',
    //   name: 'Biashara Microfinance',
    //   description: 'Local microfinance institution focused on empowering small business owners with accessible loans.',
    //   contact_email: 'info@biashara-micro.co.tz',
    //   contact_phone: '+255723456789',
    //   website: 'https://biashara-micro.co.tz',
    //   address: 'Plot 45, Kariakoo Street, Dar es Salaam, Tanzania',
    //   is_active: true,
    //   integration_key: 'biashara_api_key',
    //   integration_secret: 'biashara_api_secret',
    //   created_at: '2025-02-01T08:15:00Z',
    //   updated_at: '2025-02-01T08:15:00Z'
    // },
    // {
    //   provider_id: 'provider_3',
    //   tenant_id: 'tenant_1',
    //   name: 'Ukwaju Credit',
    //   description: 'Specialized in small vendor financing with quick approval processes and competitive rates.',
    //   contact_email: 'loans@ukwaju.co.tz',
    //   contact_phone: '+255734567890',
    //   website: 'https://ukwaju.co.tz',
    //   address: 'Plot 78, Masaki Area, Dar es Salaam, Tanzania',
    //   is_active: false,
    //   integration_key: 'ukwaju_api_key',
    //   integration_secret: 'ukwaju_api_secret',
    //   created_at: '2025-02-15T14:20:00Z',
    //   updated_at: '2025-04-10T11:45:00Z'
    // },
    // {
    //   provider_id: 'provider_4',
    //   tenant_id: 'tenant_1',
    //   name: 'VendorGrow Finance',
    //   description: 'Tailored financial solutions for growing vendors with flexible repayment terms.',
    //   contact_email: 'support@vendorgrow.com',
    //   contact_phone: '+255745678901',
    //   website: 'https://vendorgrow.com',
    //   address: 'Plot 34, Kijitonyama, Dar es Salaam, Tanzania',
    //   is_active: true,
    //   integration_key: 'vendorgrow_api_key',
    //   integration_secret: 'vendorgrow_api_secret',
    //   created_at: '2025-03-05T09:00:00Z',
    //   updated_at: '2025-03-05T09:00:00Z'
    // },
    // {
    //   provider_id: 'provider_5',
    //   tenant_id: 'tenant_2',
    //   name: 'Mkopo Express',
    //   description: 'Fast, paperless loans for vendors with same-day approval and disbursement.',
    //   contact_email: 'info@mkopo-express.co.tz',
    //   contact_phone: '+255756789012',
    //   website: 'https://mkopo-express.co.tz',
    //   address: 'Plot 56, Upanga Road, Dar es Salaam, Tanzania',
    //   is_active: true,
    //   integration_key: 'mkopo_api_key',
    //   integration_secret: 'mkopo_api_secret',
    //   created_at: '2025-03-20T13:45:00Z',
    //   updated_at: '2025-03-20T13:45:00Z'
    // }
  ];
}
