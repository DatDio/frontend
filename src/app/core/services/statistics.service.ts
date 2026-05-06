import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.model';
import { DashboardOverview, ProductSupplierStats, RevenueChartData, StatisticsFilter, ProductSupplierStatsFilter } from '../models/statistics.model';
import { StatisticsApi } from '../../Utils/apis/statistics.api';

@Injectable({
    providedIn: 'root'
})
export class StatisticsService {
    private readonly httpClient = inject(HttpClient);

    /**
     * Lấy thống kê tổng quan cho Dashboard
     */
    getOverview(): Observable<ApiResponse<DashboardOverview>> {
        return this.httpClient.get<ApiResponse<DashboardOverview>>(StatisticsApi.OVERVIEW);
    }

    /**
     * Lấy dữ liệu biểu đồ doanh thu
     */
    getRevenueChart(filter?: StatisticsFilter): Observable<ApiResponse<RevenueChartData>> {
        let params = new HttpParams();

        if (filter?.period) {
            params = params.set('period', filter.period);
        }
        if (filter?.startDate) {
            params = params.set('startDate', filter.startDate);
        }
        if (filter?.endDate) {
            params = params.set('endDate', filter.endDate);
        }

        return this.httpClient.get<ApiResponse<RevenueChartData>>(StatisticsApi.REVENUE_CHART, { params });
    }

    getProductSupplierStats(productId: number | string, filter?: ProductSupplierStatsFilter): Observable<ApiResponse<ProductSupplierStats>> {
        let params = new HttpParams();
        if (filter?.startDate) params = params.set('startDate', filter.startDate);
        if (filter?.endDate) params = params.set('endDate', filter.endDate);
        if (filter?.toolApiKeyId) params = params.set('toolApiKeyId', filter.toolApiKeyId.toString());

        return this.httpClient.get<ApiResponse<ProductSupplierStats>>(StatisticsApi.PRODUCT_SUPPLIER_STATS(productId), { params });
    }
}
