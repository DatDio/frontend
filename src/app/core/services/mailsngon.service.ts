import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { MailsNgonApi } from '../../Utils/apis/mailsngon/mailsngon.api';

export interface MailsNgonSettings {
    baseUrl?: string;
    apiKey?: string;
    apiKeyMasked?: string;
    hasApiKey?: boolean;
    enabled?: boolean;
    autoSyncEnabled?: boolean;
    syncIntervalSeconds?: number;
}

export interface MailsNgonBalance {
    login?: string;
    email?: string;
    wallet?: number;
    rankName?: string;
}

export interface MailsNgonConnectionTestResult {
    success: boolean;
    message: string;
    balance?: number;
}

export interface MailsNgonRemoteProduct {
    mailTypeId: string;
    mailTypeKey: string;
    mailTypeName: string;
    mailGroupName?: string;
    price?: number;
    stock?: number;
    ttl?: string;
    location?: string;
    note?: string;
    isMapped?: boolean;
    mappingId?: number;
    localProductId?: number;
    localProductName?: string;
    localPrice?: number;
    categoryId?: number;
    categoryName?: string;
    localDescription?: string;
    autoSync?: boolean;
    status?: number;
}

export interface MailsNgonProductMapping {
    id?: number;
    mailTypeId?: string;
    mailTypeKey?: string;
    mailTypeName?: string;
    mailGroupName?: string;
    ttl?: string;
    location?: string;
    note?: string;
    externalPrice?: number;
    lastSyncedStock?: number;
    localProductId?: number;
    localProductName?: string;
    localPrice?: number;
    categoryId?: number;
    categoryName?: string;
    localDescription?: string;
    profitPerItem?: number;
    profitPercent?: number;
    autoSync?: boolean;
    status?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface MailsNgonMappingFilter {
    localProductId?: number;
    status?: number;
    page?: number;
    limit?: number;
}

@Injectable({
    providedIn: 'root'
})
export class MailsNgonService {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    getSettings(): Observable<ApiResponse<MailsNgonSettings>> {
        return this.httpClient.get<ApiResponse<MailsNgonSettings>>(MailsNgonApi.SETTINGS);
    }

    updateSettings(data: MailsNgonSettings): Observable<ApiResponse<MailsNgonSettings>> {
        this.loaderService.show();
        return this.httpClient
            .put<ApiResponse<MailsNgonSettings>>(MailsNgonApi.SETTINGS, data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    testConnection(): Observable<ApiResponse<MailsNgonConnectionTestResult>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<MailsNgonConnectionTestResult>>(MailsNgonApi.TEST_CONNECTION, {})
            .pipe(finalize(() => this.loaderService.hide()));
    }

    getBalance(): Observable<ApiResponse<MailsNgonBalance>> {
        return this.httpClient.get<ApiResponse<MailsNgonBalance>>(MailsNgonApi.BALANCE);
    }

    getProducts(): Observable<ApiResponse<MailsNgonRemoteProduct[]>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<MailsNgonRemoteProduct[]>>(MailsNgonApi.PRODUCTS)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    listMappings(filter?: MailsNgonMappingFilter): Observable<ApiResponse<PaginatedResponse<MailsNgonProductMapping>>> {
        let params = new HttpParams();
        if (filter?.localProductId != null) params = params.set('localProductId', filter.localProductId.toString());
        if (filter?.status != null) params = params.set('status', filter.status.toString());
        if (filter?.page != null) params = params.set('page', filter.page.toString());
        if (filter?.limit != null) params = params.set('limit', filter.limit.toString());

        return this.httpClient.get<ApiResponse<PaginatedResponse<MailsNgonProductMapping>>>(
            MailsNgonApi.MAPPINGS,
            { params }
        );
    }

    getMapping(id: number): Observable<ApiResponse<MailsNgonProductMapping>> {
        return this.httpClient.get<ApiResponse<MailsNgonProductMapping>>(MailsNgonApi.GET_MAPPING(id));
    }

    getMappingByLocalProduct(localProductId: number): Observable<ApiResponse<MailsNgonProductMapping | null>> {
        return this.httpClient.get<ApiResponse<MailsNgonProductMapping | null>>(
            MailsNgonApi.GET_MAPPING_BY_LOCAL_PRODUCT(localProductId)
        );
    }

    createMapping(data: MailsNgonProductMapping): Observable<ApiResponse<MailsNgonProductMapping>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<MailsNgonProductMapping>>(MailsNgonApi.MAPPINGS, data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    updateMapping(id: number, data: Partial<MailsNgonProductMapping>): Observable<ApiResponse<MailsNgonProductMapping>> {
        this.loaderService.show();
        return this.httpClient
            .put<ApiResponse<MailsNgonProductMapping>>(MailsNgonApi.GET_MAPPING(id), data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    deleteMapping(id: number): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .delete<ApiResponse<void>>(MailsNgonApi.GET_MAPPING(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    syncStock(): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<void>>(MailsNgonApi.SYNC_STOCK, {})
            .pipe(finalize(() => this.loaderService.hide()));
    }
}
