import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { Rank, RankFilter, UserRankInfo } from '../models/rank.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { AdminRankApi } from '../../Utils/apis/ranks/admin-rank.api';
import { ClientRankApi } from '../../Utils/apis/ranks/client-rank.api';

@Injectable({
    providedIn: 'root'
})
export class RankService {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    // ========== CLIENT APIs ==========

    /**
     * Get all active ranks (for client display)
     */
    getAllRanks(): Observable<ApiResponse<Rank[]>> {
        return this.httpClient.get<ApiResponse<Rank[]>>(ClientRankApi.GET_ALL);
    }

    /**
     * Get current user's rank info
     */
    getMyRank(): Observable<ApiResponse<UserRankInfo>> {
        return this.httpClient.get<ApiResponse<UserRankInfo>>(ClientRankApi.GET_MY_RANK);
    }

    // ========== ADMIN APIs ==========

    /**
     * Search ranks with filters (admin)
     */
    list(filter?: RankFilter): Observable<ApiResponse<PaginatedResponse<Rank>>> {
        const params = this.createRankFilter(filter);
        return this.httpClient.get<ApiResponse<PaginatedResponse<Rank>>>(AdminRankApi.SEARCH, { params });
    }

    /**
     * Get rank by ID (admin)
     */
    getById(id: number): Observable<ApiResponse<Rank>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<Rank>>(AdminRankApi.GET_BY_ID(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Create new rank with FormData (admin)
     * @param data Form data containing rank info and optional icon file
     */
    create(data: FormData): Observable<ApiResponse<Rank>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<Rank>>(AdminRankApi.CREATE, data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Update rank with FormData (admin)
     * @param id Rank ID
     * @param data Form data containing rank info and optional icon file
     */
    update(id: number, data: FormData): Observable<ApiResponse<Rank>> {
        this.loaderService.show();
        return this.httpClient
            .put<ApiResponse<Rank>>(AdminRankApi.UPDATE(id), data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Delete rank (admin)
     */
    delete(id: number): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .delete<ApiResponse<void>>(AdminRankApi.DELETE(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    // ========== FILTER BUILDER ==========
    private createRankFilter(filter?: RankFilter): HttpParams {
        let params = new HttpParams();

        if (!filter) return params;

        if (filter.name) params = params.set('name', filter.name);
        if (filter.status) params = params.set('status', filter.status);
        if (filter.page != null) params = params.set('page', filter.page.toString());
        if (filter.limit != null) params = params.set('limit', filter.limit.toString());
        if (filter.sort) params = params.set('sort', filter.sort);

        return params;
    }
}
