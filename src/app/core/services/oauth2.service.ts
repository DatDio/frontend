import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { OAuth2Request, OAuth2RequestCreate, OAuth2RequestFilter } from '../models/oauth2-request.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { OAuth2Api, AdminOAuth2Api } from '../../Utils/apis/oauth2/oauth2.api';

@Injectable({
    providedIn: 'root'
})
export class OAuth2Service {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    // ==================== CLIENT ENDPOINTS ====================

    /**
     * Create new OAuth2 request
     */
    create(request: OAuth2RequestCreate): Observable<ApiResponse<OAuth2Request>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<OAuth2Request>>(OAuth2Api.CREATE, request)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Get user's OAuth2 requests
     */
    getMyRequests(page = 0, size = 10): Observable<ApiResponse<PaginatedResponse<OAuth2Request>>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.httpClient.get<ApiResponse<PaginatedResponse<OAuth2Request>>>(OAuth2Api.LIST, { params });
    }

    /**
     * Get request by ID
     */
    getById(id: number | string): Observable<ApiResponse<OAuth2Request>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<OAuth2Request>>(OAuth2Api.GET_BY_ID(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Cancel pending request
     */
    cancel(id: number | string): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .delete<ApiResponse<void>>(OAuth2Api.CANCEL(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Get user's current pending/processing request (if any)
     */
    getMyPending(): Observable<ApiResponse<OAuth2Request | null>> {
        return this.httpClient.get<ApiResponse<OAuth2Request | null>>(OAuth2Api.MY_PENDING);
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Admin: Search all requests
     */
    adminSearch(filter: OAuth2RequestFilter): Observable<ApiResponse<PaginatedResponse<OAuth2Request>>> {
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
        return this.httpClient.get<ApiResponse<PaginatedResponse<OAuth2Request>>>(AdminOAuth2Api.SEARCH, { params });
    }

    /**
     * Admin: Get request by ID
     */
    adminGetById(id: number | string): Observable<ApiResponse<OAuth2Request>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<OAuth2Request>>(AdminOAuth2Api.GET_BY_ID(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Admin: Force complete request
     */
    adminForceComplete(id: number | string): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<void>>(AdminOAuth2Api.FORCE_COMPLETE(id), {})
            .pipe(finalize(() => this.loaderService.hide()));
    }
}
