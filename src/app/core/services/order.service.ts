import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { Order, OrderCreate, OrderFilter } from '../models/order.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { AdminOrderApi } from '../../Utils/apis/orders/admin-order.api';
import { OrderApi } from '../../Utils/apis/orders/client-order.api';

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

    let params = new HttpParams()
      .set('page', (filter?.page ?? 0).toString())
      .set('limit', (filter?.limit ?? 10).toString())
      .set('sort', filter?.sort ?? 'id,desc');

    if (filter?.orderNumber) params = params.set('orderNumber', filter.orderNumber);
    if (filter?.userEmail) params = params.set('userEmail', filter.userEmail);
    if (filter?.orderStatus) params = params.set('orderStatus', filter.orderStatus);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<Order>>>(AdminOrderApi.SEARCH, { params })

  }

  /**
 * Client: Get current user's orders
 */
  searchMyOrders(filter?: OrderFilter): Observable<ApiResponse<PaginatedResponse<Order>>> {
    let params = new HttpParams()
      .set('page', (filter?.page ?? 0).toString())
      .set('limit', (filter?.limit ?? 10).toString())
      .set('sort', filter?.sort ?? 'id,desc');

    if (filter?.orderNumber) params = params.set('orderNumber', filter.orderNumber);
    if (filter?.orderStatus) params = params.set('orderStatus', filter.orderStatus);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<Order>>>(OrderApi.SEARCH, { params })
      .pipe(finalize(() => this.loaderService.hide()));
  }

  buy(request: OrderCreate): Observable<ApiResponse<Order>> {
    return this.httpClient.post<ApiResponse<Order>>(
      OrderApi.BUY,
      request
    );
  }

  /**
   * Get order by ID
   */
  getById(id: number | string): Observable<ApiResponse<Order>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<Order>>(OrderApi.GET_BY_ID(id))
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Delete order
   */
  delete(id: number | string): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(AdminOrderApi.DELETE(id))
      .pipe(finalize(() => this.loaderService.hide()));
  }
}
