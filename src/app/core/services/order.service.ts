import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { Order, OrderFilter } from '../models/order.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';

const API_URL = '/api/admin/orders';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);

  /**
   * Get list of orders with pagination
   */
  list(filter?: OrderFilter): Observable<ApiResponse<PaginatedResponse<Order>>> {
    this.loaderService.show();

    let params = new HttpParams()
      .set('page', (filter?.page ?? 0).toString())
      .set('limit', (filter?.limit ?? 10).toString())
      .set('sort', filter?.sort ?? 'id,desc');

    if (filter?.orderNumber) params = params.set('orderNumber', filter.orderNumber);
    if (filter?.userEmail) params = params.set('userEmail', filter.userEmail);
    if (filter?.orderStatus) params = params.set('orderStatus', filter.orderStatus);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<Order>>>(`${API_URL}/search`, { params })
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Get order by ID
   */
  getById(id: number | string): Observable<ApiResponse<Order>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<Order>>(`${API_URL}/${id}`)
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Delete order
   */
  delete(id: number | string): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(`${API_URL}/${id}`)
      .pipe(finalize(() => this.loaderService.hide()));
  }
}
