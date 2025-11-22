import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { ProductItem, ProductItemCreate, ProductItemFilter } from '../models/product-item.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';

const API_URL = '/api/admin/product-items';

@Injectable({
  providedIn: 'root'
})
export class ProductItemService {
  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);

  /**
   * Get list of product items with pagination
   */
  list(productId: number | string, filter?: ProductItemFilter): Observable<ApiResponse<PaginatedResponse<ProductItem>>> {
    this.loaderService.show();

    let params = new HttpParams()
      .set('productId', productId.toString())
      .set('page', (filter?.page ?? 0).toString())
      .set('limit', (filter?.limit ?? 10).toString())
      .set('sort', filter?.sort ?? 'id,desc');

    if (filter?.sold !== undefined) params = params.set('sold', filter.sold.toString());

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<ProductItem>>>(`${API_URL}/search`, { params })
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Get product item by ID
   */
  getById(id: number | string): Observable<ApiResponse<ProductItem>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<ProductItem>>(`${API_URL}/${id}`)
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Create single product item
   */
  create(data: ProductItemCreate): Observable<ApiResponse<ProductItem>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<ProductItem>>(`${API_URL}`, data)
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Bulk create multiple product items
   */
  bulkCreate(items: ProductItemCreate[]): Observable<ApiResponse<ProductItem[]>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<ProductItem[]>>(`${API_URL}/bulk`, { items })
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Delete product item
   */
  delete(id: number | string): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(`${API_URL}/${id}`)
      .pipe(finalize(() => this.loaderService.hide()));
  }
}
