import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { User, UserFilter, CreateUserRequest, UpdateUserRequest } from '../models/user.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { AdminUserApi } from '../../Utils/apis/users/admin-user.api';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);

  // ===== SEARCH USERS =====
  list(filter?: UserFilter): Observable<ApiResponse<PaginatedResponse<User>>> {
    this.loaderService.show();

    const params = this.createUserFilter(filter);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<User>>>(AdminUserApi.SEARCH, {
        params: params
      })
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== GET BY ID =====
  getById(id: number): Observable<ApiResponse<User>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<User>>(AdminUserApi.GET_BY_ID(id))
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== CREATE =====
  create(data: CreateUserRequest): Observable<ApiResponse<User>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<User>>(AdminUserApi.CREATE, data)
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== UPDATE =====
  update(data: UpdateUserRequest): Observable<ApiResponse<User>> {
    this.loaderService.show();

    return this.httpClient
      .put<ApiResponse<User>>(AdminUserApi.UPDATE(data.id), data)
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== DELETE MULTIPLE =====
  delete(ids: number[]): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<void>>(AdminUserApi.DELETE, { ids: ids.join(',') })
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== BULK UPDATE STATUS =====
  bulkUpdateStatus(ids: number[], status: string): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<void>>(AdminUserApi.BULK_UPDATE_STATUS, {
        ids: ids.join(','),
        status
      })
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== EXPORT EXCEL =====
  exportExcel(filter?: UserFilter): Observable<Blob> {
    this.loaderService.show();
    const params = this.createUserFilter(filter);

    return this.httpClient
      .post<Blob>(AdminUserApi.EXPORT, params, {
        responseType: 'blob' as 'json'
      })
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  // ===== FILTER BUILDER =====
  private createUserFilter(filter?: UserFilter): HttpParams {
  let params = new HttpParams()
    .set('page', '0')
    .set('limit', '20');

  if (!filter) return params;

  if (filter.email) params = params.set('email', filter.email);
  if (filter.username) params = params.set('username', filter.username);
  if (filter.role) params = params.set('role', filter.role);
  if (filter.status) params = params.set('status', filter.status);

  params = params
    .set('page', (filter.page ?? 0).toString())
    .set('limit', (filter.limit ?? 10).toString())
    .set('sort', filter.sort ?? 'createdAt,desc');

  return params;
}


}
