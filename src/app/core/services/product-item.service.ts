import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { ProductItem, ProductItemCreate, ProductItemFilter } from '../models/product-item.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { AdminProductItemApi } from '../../Utils/apis/product-items/admin-product-item.api';

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
   

    let params = new HttpParams()
      .set('productId', productId.toString())
      .set('page', (filter?.page ?? 0).toString())
      .set('limit', (filter?.limit ?? 10).toString())
      .set('sort', filter?.sort ?? 'id,desc');

    if (filter?.sold !== undefined) params = params.set('sold', filter.sold.toString());

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<ProductItem>>>(AdminProductItemApi.SEARCH, { params })
  }



  /**
   * Create single product item
   */
  create(data: ProductItemCreate): Observable<ApiResponse<ProductItem>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<ProductItem>>(AdminProductItemApi.CREATE, data)
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Bulk create multiple product items
   */
  // bulkCreate(items: ProductItemCreate[]): Observable<ApiResponse<ProductItem[]>> {
  //   this.loaderService.show();

  //   return this.httpClient
  //     .post<ApiResponse<ProductItem[]>>(`${API_URL}/bulk`, { items })
  //     .pipe(finalize(() => this.loaderService.hide()));
  // }

  /**
   * Delete product item
   */
  delete(id: number): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(AdminProductItemApi.DELETE(id))
      .pipe(finalize(() => this.loaderService.hide()));
  }
}
