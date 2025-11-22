import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { Product, ProductCreate, ProductUpdate, ProductFilter } from '../models/product.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';

const API_URL = '/api/admin/products';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);

  /**
   * Get list of products with pagination
   */
  list(filter?: ProductFilter): Observable<ApiResponse<PaginatedResponse<Product>>> {
    this.loaderService.show();

    let params = new HttpParams()
      .set('page', (filter?.page ?? 0).toString())
      .set('limit', (filter?.limit ?? 10).toString())
      .set('sort', filter?.sort ?? 'id,desc');

    if (filter?.name) params = params.set('name', filter.name);
    if (filter?.categoryId) params = params.set('categoryId', filter.categoryId.toString());
    if (filter?.minPrice !== undefined) params = params.set('minPrice', filter.minPrice.toString());
    if (filter?.maxPrice !== undefined) params = params.set('maxPrice', filter.maxPrice.toString());
    if (filter?.status) params = params.set('status', filter.status);

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<Product>>>(`${API_URL}/search`, { params })
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Get product by ID
   */
  getById(id: number | string): Observable<ApiResponse<Product>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<Product>>(`${API_URL}/${id}`)
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Create new product
   */
  create(data: ProductCreate): Observable<ApiResponse<Product>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<Product>>(`${API_URL}`, data)
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Update product
   */
  update(data: ProductUpdate): Observable<ApiResponse<Product>> {
    this.loaderService.show();

    return this.httpClient
      .put<ApiResponse<Product>>(`${API_URL}/${data.id}`, data)
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Delete product
   */
  delete(id: number | string): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(`${API_URL}/${id}`)
      .pipe(finalize(() => this.loaderService.hide()));
  }
}
