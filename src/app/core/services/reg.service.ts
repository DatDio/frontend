import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { RegRequest, RegRequestCreate, RegRequestFilter } from '../models/reg-request.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { RegApi, AdminRegApi } from '../../Utils/apis/reg/reg.api';

@Injectable({
    providedIn: 'root'
})
export class RegService {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    // ==================== CLIENT ENDPOINTS ====================

    /**
     * Create new registration request
     */
    create(request: RegRequestCreate): Observable<ApiResponse<RegRequest>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<RegRequest>>(RegApi.CREATE, request)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Get user's registration requests
     */
    getMyRequests(page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<RegRequest>>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.httpClient.get<ApiResponse<PaginatedResponse<RegRequest>>>(RegApi.LIST, { params });
    }

    /**
     * Get request by ID
     */
    getById(id: number | string): Observable<ApiResponse<RegRequest>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<RegRequest>>(RegApi.GET_BY_ID(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Cancel pending request
     */
    cancel(id: number | string): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .delete<ApiResponse<void>>(RegApi.CANCEL(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Get user's current active (PENDING/PROCESSING) requests
     */
    getMyActiveRequests(): Observable<ApiResponse<RegRequest[]>> {
        return this.httpClient.get<ApiResponse<RegRequest[]>>(RegApi.MY_ACTIVE);
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Admin: Search all requests
     */
    adminSearch(filter: RegRequestFilter): Observable<ApiResponse<PaginatedResponse<RegRequest>>> {
        let params = new HttpParams()
            .set('page', (filter.page ?? 0).toString())
            .set('limit', (filter.limit ?? 20).toString())

        if (filter.userId) params = params.set('userId', filter.userId.toString());
        if (filter.userEmail) params = params.set('userEmail', filter.userEmail);
        if (filter.requestNumber) params = params.set('requestNumber', filter.requestNumber);
        if (filter.status) params = params.set('status', filter.status);
        if (filter.createdFrom) params = params.set('createdFrom', filter.createdFrom);
        if (filter.createdTo) params = params.set('createdTo', filter.createdTo);
        if (filter.sort) params = params.set('sort', filter.sort);
        return this.httpClient.get<ApiResponse<PaginatedResponse<RegRequest>>>(AdminRegApi.SEARCH, { params });
    }

    /**
     * Admin: Get request by ID
     */
    adminGetById(id: number | string): Observable<ApiResponse<RegRequest>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<RegRequest>>(AdminRegApi.GET_BY_ID(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Admin: Cleanup expired requests
     */
    adminCleanup(): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<void>>(AdminRegApi.CLEANUP, {})
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Admin: Reset stuck requests
     */
    adminResetStuck(): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<void>>(AdminRegApi.RESET_STUCK, {})
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Admin: Force complete request
     */
    adminForceComplete(id: number | string): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<void>>(AdminRegApi.FORCE_COMPLETE(id), {})
            .pipe(finalize(() => this.loaderService.hide()));
    }
}
