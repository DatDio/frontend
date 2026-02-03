import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { ExternalApiProviderApi } from '../../Utils/apis/external-api/external-api.api';

// ================== INTERFACES ==================

export interface ExternalApiProvider {
    id?: number;
    name: string;
    baseUrl: string;
    apiKey?: string;

    authType: 'HEADER' | 'QUERY_PARAM';
    authHeaderName?: string;
    authQueryParam?: string;

    productListMethod?: string;
    productListPath?: string;
    productListDataPath?: string;

    productIdPath?: string;
    productNamePath?: string;
    productPricePath?: string;
    productStockPath?: string;
    customFieldMappings?: string;  // JSON array: [{"name": "slug", "path": "$.slug"}]

    orderMethod?: string;
    orderPath?: string;
    orderBodyTemplate?: string;
    orderDataPath?: string;
    orderSuccessPath?: string;
    orderSuccessValue?: string;
    orderMessagePath?: string;
    orderErrorCodePath?: string;
    orderErrorCodeMappings?: string;

    balancePath?: string;
    balanceValuePath?: string;

    syncIntervalSeconds?: number;
    autoSyncEnabled?: boolean;

    status?: number;
    notes?: string;

    createdAt?: string;
    updatedAt?: string;
    mappedProductCount?: number;
    currentBalance?: number;
}

export interface ExternalProduct {
    id: string;
    slug?: string;
    name: string;
    price: number;
    stock: number;
    description?: string;
    providerId?: number;
    providerName?: string;
    isMapped?: boolean;
    localProductId?: number;
}

export interface FetchProductsResult {
    products: ExternalProduct[];
    rawResponse: string;
    sampleItem: string;
}

export interface ExternalProductMapping {
    id?: number;
    providerId: number;
    providerName?: string;

    externalProductId?: string;
    externalProductSlug?: string;
    externalProductName?: string;
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

export interface ProviderFilter {
    name?: string;
    status?: number;
    page?: number;
    limit?: number;
}

export interface MappingFilter {
    providerId?: number;
    status?: number;
    page?: number;
    limit?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ExternalApiService {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    // ================== PROVIDERS ==================

    listProviders(filter?: ProviderFilter): Observable<ApiResponse<PaginatedResponse<ExternalApiProvider>>> {
        let params = new HttpParams();
        if (filter?.name) params = params.set('name', filter.name);
        if (filter?.status != null) params = params.set('status', filter.status.toString());
        if (filter?.page != null) params = params.set('page', filter.page.toString());
        if (filter?.limit != null) params = params.set('limit', filter.limit.toString());

        return this.httpClient.get<ApiResponse<PaginatedResponse<ExternalApiProvider>>>(
            ExternalApiProviderApi.PROVIDERS, { params }
        );
    }

    getActiveProviders(): Observable<ApiResponse<ExternalApiProvider[]>> {
        return this.httpClient.get<ApiResponse<ExternalApiProvider[]>>(
            ExternalApiProviderApi.PROVIDERS_ACTIVE
        );
    }

    getProvider(id: number): Observable<ApiResponse<ExternalApiProvider>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<ExternalApiProvider>>(ExternalApiProviderApi.GET_PROVIDER(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    createProvider(data: ExternalApiProvider): Observable<ApiResponse<ExternalApiProvider>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<ExternalApiProvider>>(ExternalApiProviderApi.PROVIDERS, data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    updateProvider(id: number, data: Partial<ExternalApiProvider>): Observable<ApiResponse<ExternalApiProvider>> {
        this.loaderService.show();
        return this.httpClient
            .put<ApiResponse<ExternalApiProvider>>(ExternalApiProviderApi.GET_PROVIDER(id), data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    deleteProvider(id: number): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .delete<ApiResponse<void>>(ExternalApiProviderApi.GET_PROVIDER(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    testConnection(id: number): Observable<ApiResponse<{ success: boolean; balance: any; message: string }>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<{ success: boolean; balance: any; message: string }>>(
                ExternalApiProviderApi.TEST_CONNECTION(id), {}
            )
            .pipe(finalize(() => this.loaderService.hide()));
    }

    fetchExternalProducts(id: number): Observable<ApiResponse<ExternalProduct[]>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<ExternalProduct[]>>(ExternalApiProviderApi.FETCH_PRODUCTS(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    fetchExternalProductsWithRaw(id: number): Observable<ApiResponse<FetchProductsResult>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<FetchProductsResult>>(ExternalApiProviderApi.FETCH_PRODUCTS_RAW(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    fetchExternalProductsWithRawPreview(data: ExternalApiProvider): Observable<ApiResponse<FetchProductsResult>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<FetchProductsResult>>(ExternalApiProviderApi.FETCH_PRODUCTS_RAW_PREVIEW, data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    getBalance(id: number): Observable<ApiResponse<{ balance: number | null; rawResponse?: string; sampleItem?: string }>> {
        return this.httpClient.get<ApiResponse<{ balance: number | null; rawResponse?: string; sampleItem?: string }>>(
            ExternalApiProviderApi.GET_BALANCE(id)
        );
    }

    getBalancePreview(data: ExternalApiProvider): Observable<ApiResponse<{ balance: number | null; rawResponse?: string; sampleItem?: string }>> {
        return this.httpClient.post<ApiResponse<{ balance: number | null; rawResponse?: string; sampleItem?: string }>>(
            ExternalApiProviderApi.GET_BALANCE_PREVIEW,
            data
        );
    }

    placeTestOrder(providerId: number, productId: string, quantity: number): Observable<any> {
        this.loaderService.show();
        return this.httpClient.post<any>(
            ExternalApiProviderApi.PLACE_ORDER(providerId),
            { productId, quantity }
        ).pipe(finalize(() => this.loaderService.hide()));
    }

    placeTestOrderPreview(provider: ExternalApiProvider, productId: string, quantity: number): Observable<any> {
        this.loaderService.show();
        return this.httpClient.post<any>(
            ExternalApiProviderApi.PLACE_ORDER_PREVIEW,
            { provider, productId, quantity }
        ).pipe(finalize(() => this.loaderService.hide()));
    }

    // ================== MAPPINGS ==================

    listMappings(filter?: MappingFilter): Observable<ApiResponse<PaginatedResponse<ExternalProductMapping>>> {
        let params = new HttpParams();
        if (filter?.providerId != null) params = params.set('providerId', filter.providerId.toString());
        if (filter?.status != null) params = params.set('status', filter.status.toString());
        if (filter?.page != null) params = params.set('page', filter.page.toString());
        if (filter?.limit != null) params = params.set('limit', filter.limit.toString());

        return this.httpClient.get<ApiResponse<PaginatedResponse<ExternalProductMapping>>>(
            ExternalApiProviderApi.MAPPINGS, { params }
        );
    }

    getMappingsByProvider(providerId: number): Observable<ApiResponse<ExternalProductMapping[]>> {
        return this.httpClient.get<ApiResponse<ExternalProductMapping[]>>(
            ExternalApiProviderApi.MAPPINGS_BY_PROVIDER(providerId)
        );
    }

    getMapping(id: number): Observable<ApiResponse<ExternalProductMapping>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<ExternalProductMapping>>(ExternalApiProviderApi.GET_MAPPING(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    createMapping(data: ExternalProductMapping): Observable<ApiResponse<ExternalProductMapping>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<ExternalProductMapping>>(ExternalApiProviderApi.MAPPINGS, data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    updateMapping(id: number, data: Partial<ExternalProductMapping>): Observable<ApiResponse<ExternalProductMapping>> {
        this.loaderService.show();
        return this.httpClient
            .put<ApiResponse<ExternalProductMapping>>(ExternalApiProviderApi.GET_MAPPING(id), data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    deleteMapping(id: number): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .delete<ApiResponse<void>>(ExternalApiProviderApi.GET_MAPPING(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    syncStock(providerId: number): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<void>>(ExternalApiProviderApi.SYNC_STOCK(providerId), {})
            .pipe(finalize(() => this.loaderService.hide()));
    }
}
