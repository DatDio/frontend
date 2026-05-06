/**
 * DTO cho thống kê tổng quan Dashboard
 */
export interface DashboardOverview {
    ordersToday: number;
    ordersYesterday: number;
    ordersGrowthPercent: number;

    revenueToday: number;
    revenueYesterday: number;
    revenueGrowthPercent: number;

    ordersThisMonth: number;
    revenueThisMonth: number;

    totalOrders: number;
    totalRevenue: number;
}

/**
 * DTO cho dữ liệu biểu đồ doanh thu
 */
export interface RevenueChartData {
    labels: string[];
    revenues: number[];
    orderCounts: number[];

    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
}

/**
 * Filter cho thống kê
 */
export interface StatisticsFilter {
    startDate?: string;
    endDate?: string;
    period?: 'WEEK' | 'MONTH' | 'YEAR';
}

export interface ProductSupplierDailyPoint {
    statDate: string;
    soldCount: number;
    expiredCount: number;
}

export interface ProductSupplierToolKeyBreakdown {
    toolApiKeyId: number;
    toolName?: string;
    toolKeyPrefix?: string;
    soldCount: number;
    expiredCount: number;
}

export interface ProductSupplierStatsFilter {
    startDate?: string;
    endDate?: string;
    toolApiKeyId?: number;
}

export interface ProductSupplierStats {
    productId: number;
    productName: string;
    startDate: string;
    endDate: string;
    todaySold: number;
    todayExpired: number;
    recentDays: ProductSupplierDailyPoint[];
    byToolKey: ProductSupplierToolKeyBreakdown[];
}
