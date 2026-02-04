import { LoanRequest, PaymentSchedule, VendorRevenue } from '../types';

// Generate mock loan requests
export function generateMockLoanRequests(): LoanRequest[] {
  return [
    {
      request_id: 'request_1',
      tenant_id: 'tenant_1',
      vendor_id: 'vendor_1',
      vendor_name: 'TechGadgets Store',
      vendor_contact: '+255712345678',
      product_id: 'product_1',
      product_name: 'Starter Business Loan',
      provider_id: 'provider_1',
      provider_name: 'DCB Bank',
      loan_amount: 500000,
      interest_rate: 5.99,
      payment_frequency: 'monthly',
      term_length: 6,
      total_payable: 530000,
      remaining_balance: 265000,
      purpose: 'Inventory expansion for new product line',
      status: 'approved',
      documents: [
        {
          document_id: 'doc_1',
          document_type: 'business_plan',
          document_url: 'https://example.com/docs/business_plan_vendor1.pdf',
          file_name: 'business_plan_vendor1.pdf',
          submitted_at: '2025-01-25T10:30:00Z'
        }
      ],
      approved_by: 'user_admin',
      approved_at: '2025-01-28T14:20:00Z',
      created_at: '2025-01-25T10:30:00Z',
      updated_at: '2025-01-28T14:20:00Z',
      penalties: [
        {
          penalty_id: 'pen_1',
          amount: 50000,
          reason: 'Late payment for March',
          applied_at: '2025-03-15T10:00:00Z',
          status: 'pending'
        }
      ]
    },
    // {
    //   request_id: 'request_2',
    //   tenant_id: 'tenant_1',
    //   vendor_id: 'vendor_2',
    //   vendor_name: 'Fashion Boutique',
    //   vendor_contact: '+255723456789',
    //   product_id: 'product_3',
    //   product_name: 'Quick Cash Advance',
    //   provider_id: 'provider_2',
    //   provider_name: 'Biashara Microfinance',
    //   loan_amount: 200000,
    //   interest_rate: 7.5,
    //   payment_frequency: 'weekly',
    //   term_length: 3,
    //   total_payable: 215000,
    //   remaining_balance: 215000,
    //   purpose: 'Cover operational expenses during low season',
    //   status: 'pending',
    //   created_at: '2025-02-10T09:15:00Z',
    //   updated_at: '2025-02-10T09:15:00Z'
    // },
    // {
    //   request_id: 'request_3',
    //   tenant_id: 'tenant_1',
    //   vendor_id: 'vendor_3',
    //   vendor_name: 'Organic Foods Market',
    //   vendor_contact: '+255734567890',
    //   product_id: 'product_5',
    //   product_name: 'Premium Vendor Expansion',
    //   provider_id: 'provider_4',
    //   provider_name: 'VendorGrow Finance',
    //   loan_amount: 10000000,
    //   interest_rate: 3.99,
    //   payment_frequency: 'monthly',
    //   term_length: 36,
    //   total_payable: 11197200,
    //   remaining_balance: 11197200,
    //   purpose: 'Open a second branch location in Arusha',
    //   status: 'rejected',
    //   rejection_reason: 'Insufficient revenue history to support loan amount',
    //   created_at: '2025-03-15T13:45:00Z',
    //   updated_at: '2025-03-20T09:30:00Z'
    // },
    // {
    //   request_id: 'request_4',
    //   tenant_id: 'tenant_1',
    //   vendor_id: 'vendor_4',
    //   vendor_name: 'Electronic Solutions',
    //   vendor_contact: '+255745678901',
    //   product_id: 'product_4',
    //   product_name: 'Equipment Financing',
    //   provider_id: 'provider_2',
    //   provider_name: 'Biashara Microfinance',
    //   loan_amount: 1500000,
    //   interest_rate: 6.25,
    //   payment_frequency: 'bi-weekly',
    //   term_length: 12,
    //   total_payable: 1593750,
    //   remaining_balance: 1200000,
    //   purpose: 'Purchase new testing equipment and tools',
    //   status: 'active',
    //   approved_by: 'user_admin',
    //   approved_at: '2025-04-05T15:10:00Z',
    //   disbursed_at: '2025-04-06T10:00:00Z',
    //   created_at: '2025-04-02T10:20:00Z',
    //   updated_at: '2025-04-05T15:10:00Z'
    // },
    {
      request_id: 'request_5',
      tenant_id: 'tenant_1',
      vendor_id: 'vendor_1',
      vendor_name: 'TechGadgets Store',
      vendor_contact: '+255712345678',
      product_id: 'product_2',
      product_name: 'Growth Business Loan',
      provider_id: 'provider_1',
      provider_name: 'EasyLoan Financial',
      loan_amount: 2000000,
      interest_rate: 4.5,
      payment_frequency: 'monthly',
      term_length: 18,
      total_payable: 2135000,
      remaining_balance: 0,
      purpose: 'Marketing campaign and website upgrade',
      status: 'completed',
      approved_by: 'user_admin',
      approved_at: '2024-05-25T09:30:00Z',
      disbursed_at: '2024-05-26T14:00:00Z',
      paid_at: '2025-04-10T11:20:00Z',
      created_at: '2024-05-20T14:15:00Z',
      updated_at: '2025-04-10T11:20:00Z'
    }
  ];
}

// Generate mock payment schedule based on loan parameters
export function generateMockPaymentSchedule(
  amount: number,
  interestRate: number,
  termLength: number,
  paymentFrequency: string
): PaymentSchedule[] {
  const schedule: PaymentSchedule[] = [];
  const interestRateDecimal = interestRate / 100;

  // Calculate number of payments based on frequency
  let numberOfPayments = termLength;
  if (paymentFrequency === 'weekly') {
    numberOfPayments = termLength * 4; // Approximate weeks in a month
  } else if (paymentFrequency === 'bi-weekly') {
    numberOfPayments = termLength * 2; // Bi-weekly payments per month
  }

  // Calculate payment amount (principal + interest)
  const totalInterest = amount * interestRateDecimal * (termLength / 12); // Annual interest pro-rated
  const totalAmount = amount + totalInterest;
  const paymentAmount = totalAmount / numberOfPayments;
  const principalPerPayment = amount / numberOfPayments;
  const interestPerPayment = totalInterest / numberOfPayments;

  // Generate payment dates and details
  const startDate = new Date();

  for (let i = 0; i < numberOfPayments; i++) {
    const paymentDate = new Date(startDate);

    // Set due date based on payment frequency
    if (paymentFrequency === 'weekly') {
      paymentDate.setDate(paymentDate.getDate() + (i * 7));
    } else if (paymentFrequency === 'bi-weekly') {
      paymentDate.setDate(paymentDate.getDate() + (i * 14));
    } else {
      paymentDate.setMonth(paymentDate.getMonth() + i);
    }

    // Determine payment status based on the current date
    let status: 'pending' | 'paid' | 'overdue' | 'partial' = 'pending';
    let amountPaid: number | undefined = undefined;
    let paymentDateStr: string | undefined = undefined;

    const currentDate = new Date();

    if (paymentDate < currentDate && i < 3) {
      // Past payments are typically paid
      status = 'paid';
      amountPaid = paymentAmount;
      paymentDateStr = new Date(paymentDate.getTime() - 86400000 * 2).toISOString(); // 2 days before due date
    }

    schedule.push({
      payment_id: `payment_${i + 1}`,
      due_date: paymentDate.toISOString(),
      amount: Math.round(paymentAmount * 100) / 100,
      principal: Math.round(principalPerPayment * 100) / 100,
      interest: Math.round(interestPerPayment * 100) / 100,
      status,
      payment_date: paymentDateStr,
      amount_paid: amountPaid
    });
  }

  return schedule;
}

// Generate mock vendor revenue data
export function generateMockVendorRevenue(vendorId: string, period: string): VendorRevenue {
  // Generate random amounts based on vendor and period
  const randomMultiplier = parseInt(vendorId.replace('vendor_', '')) * 1.5;
  let amount: number;
  let transactionCount: number;
  let startDate: string;
  let endDate: string;

  const currentDate = new Date();

  if (period === 'weekly') {
    amount = Math.round(randomMultiplier * 150000 + Math.random() * 50000);
    transactionCount = Math.floor(randomMultiplier * 15 + Math.random() * 10);

    const endDateObj = new Date(currentDate);
    const startDateObj = new Date(currentDate);
    startDateObj.setDate(startDateObj.getDate() - 7);

    startDate = startDateObj.toISOString();
    endDate = endDateObj.toISOString();
  } else {
    // Monthly
    amount = Math.round(randomMultiplier * 600000 + Math.random() * 200000);
    transactionCount = Math.floor(randomMultiplier * 60 + Math.random() * 40);

    const endDateObj = new Date(currentDate);
    const startDateObj = new Date(currentDate);
    startDateObj.setMonth(startDateObj.getMonth() - 1);

    startDate = startDateObj.toISOString();
    endDate = endDateObj.toISOString();
  }

  // Previous period for comparison
  const prevAmount = Math.round(amount * (0.8 + Math.random() * 0.4));
  const growthPercentage = Math.round(((amount - prevAmount) / prevAmount) * 100 * 10) / 10;

  return {
    vendor_id: vendorId,
    period,
    amount,
    transaction_count: transactionCount,
    start_date: startDate,
    end_date: endDate,
    growth_percentage: growthPercentage
  };
}
