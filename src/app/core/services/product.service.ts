import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { Product, ProductCreate, ProductUpdate, ProductFilter } from '../models/product.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { AdminProductApi } from '../../Utils/apis/products/admin-product.api';
import { ProductApi } from '../../Utils/apis/products/client-product.api';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);

  /**
   * Get list of products
   */
  list(filter?: ProductFilter): Observable<ApiResponse<PaginatedResponse<Product>>> {

    const params = this.createProductFilter(filter);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<Product>>>(ProductApi.SEARCH, { params })
  }

  // ===== FILTER BUILDER =====
  private createProductFilter(filter?: ProductFilter): HttpParams {
    let params = new HttpParams();

    if (!filter) return params;

    if (filter.name) params = params.set('name', filter.name);
    if (filter.categoryId != null) params = params.set('categoryId', filter.categoryId.toString());
    if (filter.minPrice != null) params = params.set('minPrice', filter.minPrice.toString());
    if (filter.maxPrice != null) params = params.set('maxPrice', filter.maxPrice.toString());
    if (filter.status) params = params.set('status', filter.status);
    if (filter.minStock != null) params = params.set('minStock', filter.minStock.toString());

    if (filter.page != null) params = params.set('page', filter.page.toString());
    if (filter.limit != null) params = params.set('limit', filter.limit.toString());

    return params;
  }

  /**
   * Get product by ID
   */
  getById(id: number): Observable<ApiResponse<Product>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<Product>>(AdminProductApi.GET_BY_ID(id))
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  /**
   * Create new product with FormData
   */
  create(data: FormData): Observable<ApiResponse<Product>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<Product>>(AdminProductApi.CREATE, data)
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  /**
   * Update product with FormData
   */
  update(id: number, data: FormData): Observable<ApiResponse<Product>> {
    this.loaderService.show();

    return this.httpClient
      .put<ApiResponse<Product>>(AdminProductApi.UPDATE(id), data)
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }

  /**
   * Delete product (REST chuẩn DELETE /{id})
   */
  delete(id: number): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(AdminProductApi.DELETE(id))
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }
}
