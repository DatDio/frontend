import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { User, UserFilter, CreateUserRequest, UpdateUserRequest } from '../models/user.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { AdminUserApi } from '../../Utils/apis/users/admin-user.api';
import { ClientUserApi } from '../../Utils/apis/users/client-user.api';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);

  // ===== SEARCH USERS =====
  list(filter?: UserFilter): Observable<ApiResponse<PaginatedResponse<User>>> {

    const params = this.createUserFilter(filter);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<User>>>(AdminUserApi.SEARCH, {
        params: params
      })
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

   getByClient(id: number): Observable<ApiResponse<User>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<User>>(ClientUserApi.GET_USER_BY_ID(id))
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
  updateByClient(data: UpdateUserRequest): Observable<ApiResponse<User>> {
    this.loaderService.show();

    return this.httpClient
      .put<ApiResponse<User>>(ClientUserApi.UPDATE(data.id), data)
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }
  // ===== DELETE MULTIPLE =====
  delete(id: number): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(`${AdminUserApi.DELETE}/${id}`)
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
    if (filter.sort) params = params.set('sort', filter.sort);

    return params;
  }


}
