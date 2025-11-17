import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoaderService } from './loader.service';
import { User, LoginRequest, LoginResponse, RegisterRequest } from '../models/user.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

export interface UserFilter {
  email?: string;
  username?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);
  private readonly apiUrl = environment.apiUrl;

  // Get user list with filters
  list(filter?: UserFilter): Observable<ApiResponse<PaginatedResponse<User>>> {
    this.loaderService.show();
    
    const params = this.createUserFilter(filter);
    
    return this.httpClient
      .post<ApiResponse<PaginatedResponse<User>>>(`${this.apiUrl}/admin/users/search`, params)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Get user by ID
  getById(id: string): Observable<ApiResponse<User>> {
    this.loaderService.show();
    
    return this.httpClient
      .get<ApiResponse<User>>(`${this.apiUrl}/admin/users/${id}`)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Create new user
  create(data: RegisterRequest): Observable<ApiResponse<User>> {
    this.loaderService.show();
    
    return this.httpClient
      .post<ApiResponse<User>>(`${this.apiUrl}/admin/users`, data)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Update user
  update(id: string, data: Partial<User>): Observable<ApiResponse<User>> {
    this.loaderService.show();
    
    return this.httpClient
      .put<ApiResponse<User>>(`${this.apiUrl}/admin/users/${id}`, data)
      .pipe(
        catchError((error) => {
          throw error;
        }),
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  // Delete users
  delete(ids: string[]): Observable<ApiResponse<void>> {
    this.loaderService.show();
    
    const requestBody = { ids: ids.join(',') };
    
    return this.httpClient
      .post<ApiResponse<void>>(`${this.apiUrl}/admin/users/delete`, requestBody)
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
  bulkUpdateStatus(ids: string[], status: string): Observable<ApiResponse<void>> {
    this.loaderService.show();
    
    const requestBody = { 
      ids: ids.join(','),
      status 
    };
    
    return this.httpClient
      .post<ApiResponse<void>>(`${this.apiUrl}/admin/users/bulk-update-status`, requestBody)
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
  exportExcel(filter?: UserFilter): Observable<Blob> {
    this.loaderService.show();
    
    const params = this.createUserFilter(filter);
    
    return this.httpClient
      .post<Blob>(`${this.apiUrl}/admin/users/export`, params, {
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

  // Helper method to create filter object
  private createUserFilter(filter?: UserFilter): any {
    if (!filter) return {};
    
    return {
      email: filter.email || null,
      username: filter.username || null,
      role: filter.role || null,
      status: filter.status || null,
      page: filter.page || 1,
      limit: filter.limit || 10,
      sort: filter.sort || 'createdAt,desc'
    };
  }
}
