import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { ApiResponse } from '../models/common.model';
import { ApiKeyApi } from '../../Utils/apis/apikeys/client-api-key.api';
import { ApiKeyGeneratedResponse, ApiKeyResponse, CreateApiKeyRequest } from '../models/api-key.model';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyService {

  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);

  // ===== GET LIST API KEYS =====
  list(): Observable<ApiResponse<ApiKeyResponse[]>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<ApiKeyResponse[]>>(ApiKeyApi.LIST)
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== CREATE API KEY =====
  create(request?: CreateApiKeyRequest): Observable<ApiResponse<ApiKeyGeneratedResponse>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<ApiKeyGeneratedResponse>>(ApiKeyApi.CREATE, request ?? {})
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== DELETE / REVOKE API KEY =====
  delete(id: number): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(ApiKeyApi.DELETE(id))
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

}
