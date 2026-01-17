import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { ToolApiKey, ToolApiKeyCreate, ToolApiKeyGenerated } from '../models/tool-apikey.model';
import { ApiResponse } from '../models/common.model';
import { AdminToolApiKeyApi } from '../../Utils/apis/tool-apikeys/tool-apikey.api';

@Injectable({
    providedIn: 'root'
})
export class ToolApiKeyService {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    /**
     * Get all Tool API Keys
     */
    getAll(): Observable<ApiResponse<ToolApiKey[]>> {
        return this.httpClient.get<ApiResponse<ToolApiKey[]>>(AdminToolApiKeyApi.LIST);
    }

    /**
     * Get Tool API Key by ID
     */
    getById(id: number | string): Observable<ApiResponse<ToolApiKey>> {
        this.loaderService.show();
        return this.httpClient
            .get<ApiResponse<ToolApiKey>>(AdminToolApiKeyApi.GET_BY_ID(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Create new Tool API Key
     */
    create(request: ToolApiKeyCreate): Observable<ApiResponse<ToolApiKeyGenerated>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<ToolApiKeyGenerated>>(AdminToolApiKeyApi.CREATE, request)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Revoke (deactivate) Tool API Key
     */
    revoke(id: number | string): Observable<ApiResponse<ToolApiKey>> {
        this.loaderService.show();
        return this.httpClient
            .put<ApiResponse<ToolApiKey>>(AdminToolApiKeyApi.REVOKE(id), {})
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Activate Tool API Key
     */
    activate(id: number | string): Observable<ApiResponse<ToolApiKey>> {
        this.loaderService.show();
        return this.httpClient
            .put<ApiResponse<ToolApiKey>>(AdminToolApiKeyApi.ACTIVATE(id), {})
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Delete Tool API Key permanently
     */
    delete(id: number | string): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .delete<ApiResponse<void>>(AdminToolApiKeyApi.DELETE(id))
            .pipe(finalize(() => this.loaderService.hide()));
    }
}
