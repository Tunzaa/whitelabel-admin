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
    fetchGmvReport: (tenantId: string) => Promise<void>;
    fetchActiveUsersReport: (tenantId: string) => Promise<void>;
    fetchOrderStatusDistributionReport: (tenantId: string) => Promise<void>;
    fetchPaymentSuccessRate: (tenantId: string) => Promise<void>;
    fetchTopPerformingProducts: (tenantId: string) => Promise<void>;
    fetchDailyGmvPerformance: (tenantId: string) => Promise<void>;
    fetchWeeklyGmvPerformance: (tenantId: string) => Promise<void>;
    fetchMonthlyGmvPerformance: (tenantId: string) => Promise<void>;
    fetchAverageOrderValue: (tenantId: string) => Promise<void>;
    fetchNewVsReturningBuyers: (tenantId: string) => Promise<void>;
    fetchCartAbandonmentRate: (tenantId: string) => Promise<void>;
    fetchAllReports: (tenantId: string) => void;
}

const createReportFetcher = <T>(set: any, endpoint: string, dataKey: keyof DashboardState, loadingKey: keyof DashboardState) => async (tenantId: string) => {
    set({ [loadingKey]: true, error: null });
    try {
        const response = await apiClient.get<ApiResponse<T>>(`/reports/${endpoint}`, undefined, { 'X-Tenant-ID': tenantId });

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
    fetchGmvReport: createReportFetcher(set, 'gmv/tenant', 'gmvData', 'loadingGmvData'),
    fetchActiveUsersReport: createReportFetcher(set, 'active-users', 'activeUsersData', 'loadingActiveUsersData'),
    fetchOrderStatusDistributionReport: createReportFetcher(set, 'order-status-distribution', 'orderStatusDistributionData', 'loadingOrderStatusDistributionData'),
    fetchPaymentSuccessRate: createReportFetcher(set, 'payment-success-rate', 'paymentSuccessRate', 'loadingPaymentSuccessRate'),
    fetchTopPerformingProducts: createReportFetcher(set, 'top-performing-products', 'topPerformingProducts', 'loadingTopPerformingProducts'),
    fetchDailyGmvPerformance: createReportFetcher(set, 'daily-gmv-performance', 'dailyGmvPerformance', 'loadingDailyGmvPerformance'),
    fetchWeeklyGmvPerformance: createReportFetcher(set, 'weekly-gmv-performance', 'weeklyGmvPerformance', 'loadingWeeklyGmvPerformance'),
    fetchMonthlyGmvPerformance: createReportFetcher(set, 'monthly-gmv-performance', 'monthlyGmvPerformance', 'loadingMonthlyGmvPerformance'),
    fetchAverageOrderValue: createReportFetcher(set, 'average-order-value', 'averageOrderValue', 'loadingAverageOrderValue'),
    fetchNewVsReturningBuyers: createReportFetcher(set, 'new-vs-returning-buyers-ratio', 'newVsReturningBuyers', 'loadingNewVsReturningBuyers'),
    fetchCartAbandonmentRate: createReportFetcher(set, 'cart-abandonment-rate', 'cartAbandonmentRate', 'loadingCartAbandonmentRate'),

    // Function to fetch all reports
    fetchAllReports: async (tenantId: string) => {
        const state = get();

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

        // Execute in batches of 3 to avoid hitting rate limits or overwhelming the server
        const BATCH_SIZE = 3;
        for (let i = 0; i < fetchers.length; i += BATCH_SIZE) {
            const batch = fetchers.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(fetcher => fetcher(tenantId)));
        }
    },
}));
