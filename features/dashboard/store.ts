import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import {
    GmvData,
    ActiveUsersData,
    OrderStatusDistributionData,
    PaymentSuccessRateData,
    TopPerformingProductData,
    DailyGmvPerformanceData,
    WeeklyGmvPerformanceData,
    MonthlyGmvPerformanceData,
    AverageOrderValueData,
    NewVsReturningBuyersData,
    CartAbandonmentRateData,
    ApiResponse,
} from './types';

interface DashboardState {
    // Data States
    gmvData: GmvData | null;
    activeUsersData: ActiveUsersData | null;
    orderStatusDistributionData: OrderStatusDistributionData[];
    paymentSuccessRate: PaymentSuccessRateData[];
    topPerformingProducts: TopPerformingProductData[];
    dailyGmvPerformance: DailyGmvPerformanceData[];
    weeklyGmvPerformance: WeeklyGmvPerformanceData[];
    monthlyGmvPerformance: MonthlyGmvPerformanceData[];
    averageOrderValue: AverageOrderValueData[];
    newVsReturningBuyers: NewVsReturningBuyersData[];
    cartAbandonmentRate: CartAbandonmentRateData[];

    // Loading States
    loadingGmvData: boolean;
    loadingActiveUsersData: boolean;
    loadingOrderStatusDistributionData: boolean;
    loadingPaymentSuccessRate: boolean;
    loadingTopPerformingProducts: boolean;
    loadingDailyGmvPerformance: boolean;
    loadingWeeklyGmvPerformance: boolean;
    loadingMonthlyGmvPerformance: boolean;
    loadingAverageOrderValue: boolean;
    loadingNewVsReturningBuyers: boolean;
    loadingCartAbandonmentRate: boolean;

    error: string | null;

    // Fetch Functions
    fetchGmvReport: (tenantId: string | null) => Promise<void>;
    fetchActiveUsersReport: (tenantId: string | null) => Promise<void>;
    fetchOrderStatusDistributionReport: (tenantId: string | null) => Promise<void>;
    fetchPaymentSuccessRate: (tenantId: string | null) => Promise<void>;
    fetchTopPerformingProducts: (tenantId: string | null) => Promise<void>;
    fetchDailyGmvPerformance: (tenantId: string | null) => Promise<void>;
    fetchWeeklyGmvPerformance: (tenantId: string | null) => Promise<void>;
    fetchMonthlyGmvPerformance: (tenantId: string | null) => Promise<void>;
    fetchAverageOrderValue: (tenantId: string | null) => Promise<void>;
    fetchNewVsReturningBuyers: (tenantId: string | null) => Promise<void>;
    fetchCartAbandonmentRate: (tenantId: string | null) => Promise<void>;
    fetchAllReports: (tenantId: string | null) => void;
}

const createReportFetcher = <T>(set: any, get: any, endpoint: string, dataKey: keyof DashboardState, loadingKey: keyof DashboardState) => {
    return async (tenantId: string | null) => {
        // Prevent concurrent fetches for the same endpoint
        const currentState = get();
        if (currentState[loadingKey]) {
          return;
        }
    
        set({ [loadingKey]: true, error: null });
        try {
            // Only include X-Tenant-ID header if tenantId is provided (not null)
            const headers = tenantId ? { 'X-Tenant-ID': tenantId } : { 'X-Tenant-ID': 'null' };
            const response = await apiClient.get<ApiResponse<T>>(`/reports/${endpoint}`, undefined, headers);

            let dataToSet: T | null = null;
            if (response.data && response.data.data) {
                if ((dataKey === 'activeUsersData' || dataKey === 'gmvData') && Array.isArray(response.data.data)) {
                    dataToSet = (response.data.data[0] || null) as T;
                } else {
                    dataToSet = response.data.data as T;
                }
            }

            const arrayKeys: (keyof DashboardState)[] = [
                'gmvData', 'orderStatusDistributionData', 'paymentSuccessRate',
                'topPerformingProducts', 'dailyGmvPerformance', 'weeklyGmvPerformance',
                'monthlyGmvPerformance', 'averageOrderValue', 'newVsReturningBuyers', 'cartAbandonmentRate'
            ];

            if (arrayKeys.includes(dataKey) && !dataToSet) {
                dataToSet = [] as unknown as T;
            }

            set({ [dataKey]: dataToSet, [loadingKey]: false });
        } catch (error: any) {
            set({ error: error.message || `Failed to fetch ${String(dataKey)}`, [loadingKey]: false });
        }
    };
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
    // Initial Data State
    gmvData: null,
    activeUsersData: null,
    orderStatusDistributionData: [],
    paymentSuccessRate: [],
    topPerformingProducts: [],
    dailyGmvPerformance: [],
    weeklyGmvPerformance: [],
    monthlyGmvPerformance: [],
    averageOrderValue: [],
    newVsReturningBuyers: [],
    cartAbandonmentRate: [],

    // Initial Loading State
    loadingGmvData: false,
    loadingActiveUsersData: false,
    loadingOrderStatusDistributionData: false,
    loadingPaymentSuccessRate: false,
    loadingTopPerformingProducts: false,
    loadingDailyGmvPerformance: false,
    loadingWeeklyGmvPerformance: false,
    loadingMonthlyGmvPerformance: false,
    loadingAverageOrderValue: false,
    loadingNewVsReturningBuyers: false,
    loadingCartAbandonmentRate: false,

    error: null,

    // Fetcher Implementations
    fetchGmvReport: createReportFetcher(set, get, 'gmv/tenant', 'gmvData', 'loadingGmvData'),
    fetchActiveUsersReport: createReportFetcher(set, get, 'active-users', 'activeUsersData', 'loadingActiveUsersData'),
    fetchOrderStatusDistributionReport: createReportFetcher(set, get, 'order-status-distribution', 'orderStatusDistributionData', 'loadingOrderStatusDistributionData'),
    fetchPaymentSuccessRate: createReportFetcher(set, get, 'payment-success-rate', 'paymentSuccessRate', 'loadingPaymentSuccessRate'),
    fetchTopPerformingProducts: createReportFetcher(set, get, 'top-performing-products', 'topPerformingProducts', 'loadingTopPerformingProducts'),
    fetchDailyGmvPerformance: createReportFetcher(set, get, 'daily-gmv-performance', 'dailyGmvPerformance', 'loadingDailyGmvPerformance'),
    fetchWeeklyGmvPerformance: createReportFetcher(set, get, 'weekly-gmv-performance', 'weeklyGmvPerformance', 'loadingWeeklyGmvPerformance'),
    fetchMonthlyGmvPerformance: createReportFetcher(set, get, 'monthly-gmv-performance', 'monthlyGmvPerformance', 'loadingMonthlyGmvPerformance'),
    fetchAverageOrderValue: createReportFetcher(set, get, 'average-order-value', 'averageOrderValue', 'loadingAverageOrderValue'),
    fetchNewVsReturningBuyers: createReportFetcher(set, get, 'new-vs-returning-buyers-ratio', 'newVsReturningBuyers', 'loadingNewVsReturningBuyers'),
    fetchCartAbandonmentRate: createReportFetcher(set, get, 'cart-abandonment-rate', 'cartAbandonmentRate', 'loadingCartAbandonmentRate'),

    // Function to fetch all reports
    fetchAllReports: async (tenantId: string | null) => {
        const state = get();

        // Fetch all reports needed for admin dashboard
        const fetchers = [
            state.fetchGmvReport,
            state.fetchActiveUsersReport,
            state.fetchOrderStatusDistributionReport,
            state.fetchPaymentSuccessRate,
            state.fetchTopPerformingProducts,
            state.fetchDailyGmvPerformance,
            state.fetchWeeklyGmvPerformance,
            state.fetchMonthlyGmvPerformance,
            state.fetchAverageOrderValue,
            state.fetchNewVsReturningBuyers,
            state.fetchCartAbandonmentRate,
        ];

        // Execute in batches of 2 to avoid hitting rate limits
        const BATCH_SIZE = 2;
        for (let i = 0; i < fetchers.length; i += BATCH_SIZE) {
            const batch = fetchers.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(fetcher => fetcher(tenantId)));
        }
    },
}));
