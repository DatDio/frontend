import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoaderService } from './loader.service';
import {
  MailAccount,
  MailAccountStatus,
  MailProvider,
  CreateMailAccountRequest,
  UpdateMailAccountRequest,
  BulkUpdateStatusRequest
} from '../models/mail-account.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

export interface MailAccountFilter {
  email?: string;
  provider?: MailProvider;
  status?: MailAccountStatus;
  userId?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MailAccountService {
  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);
  private readonly apiUrl = environment.apiUrl;

  // Get mail account list (for users)
  getMyAccounts(filter?: MailAccountFilter): Observable<ApiResponse<MailAccount[]>> {
    this.loaderService.show();
    
    return this.httpClient
      .get<ApiResponse<MailAccount[]>>(`${this.apiUrl}/mail-accounts/my`)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Get all mail accounts (for admin)
  list(filter?: MailAccountFilter): Observable<ApiResponse<PaginatedResponse<MailAccount>>> {
    this.loaderService.show();
    
    const params = this.createMailAccountFilter(filter);
    
    return this.httpClient
      .post<ApiResponse<PaginatedResponse<MailAccount>>>(`${this.apiUrl}/admin/mail-accounts/search`, params)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Get mail account by ID
  getById(id: string): Observable<ApiResponse<MailAccount>> {
    this.loaderService.show();
    
    return this.httpClient
      .get<ApiResponse<MailAccount>>(`${this.apiUrl}/mail-accounts/${id}`)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Create new mail account
  create(data: CreateMailAccountRequest): Observable<ApiResponse<MailAccount>> {
    this.loaderService.show();
    
    return this.httpClient
      .post<ApiResponse<MailAccount>>(`${this.apiUrl}/mail-accounts`, data)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Update mail account
  update(id: string, data: UpdateMailAccountRequest): Observable<ApiResponse<MailAccount>> {
    this.loaderService.show();
    
    return this.httpClient
      .put<ApiResponse<MailAccount>>(`${this.apiUrl}/mail-accounts/${id}`, data)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Delete mail accounts
  delete(ids: string[]): Observable<ApiResponse<void>> {
    this.loaderService.show();
    
    const requestBody = { ids: ids.join(',') };
    
    return this.httpClient
      .post<ApiResponse<void>>(`${this.apiUrl}/admin/mail-accounts/delete`, requestBody)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Bulk update status
  bulkUpdateStatus(data: BulkUpdateStatusRequest): Observable<ApiResponse<void>> {
    this.loaderService.show();
    
    const requestBody = { 
      ids: data.ids.join(','),
      status: data.status 
    };
    
    return this.httpClient
      .post<ApiResponse<void>>(`${this.apiUrl}/admin/mail-accounts/bulk-update`, requestBody)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Export to Excel
  exportExcel(filter?: MailAccountFilter): Observable<Blob> {
    this.loaderService.show();
    
    const params = this.createMailAccountFilter(filter);
    
    return this.httpClient
      .post<Blob>(`${this.apiUrl}/admin/mail-accounts/export`, params, {
        responseType: 'blob' as 'json'
      })
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Download template
  downloadTemplate(): Observable<Blob> {
    this.loaderService.show();
    
    return this.httpClient
      .get<Blob>(`${this.apiUrl}/admin/mail-accounts/template`, {
        responseType: 'blob' as 'json'
      })
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Import from Excel
  importExcel(formData: FormData): Observable<ApiResponse<any>> {
    this.loaderService.show();
    
    return this.httpClient
      .post<ApiResponse<any>>(`${this.apiUrl}/admin/mail-accounts/import`, formData)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Helper method to create filter object
  private createMailAccountFilter(filter?: MailAccountFilter): any {
    if (!filter) return {};
    
    return {
      email: filter.email || null,
      provider: filter.provider || null,
      status: filter.status || null,
      userId: filter.userId || null,
      page: filter.page || 1,
      limit: filter.limit || 10,
      sort: filter.sort || 'createdAt,desc'
    };
  }
}
