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
    if (filter?.accountData !== undefined) params = params.set('accountData', filter.accountData.toString());

    return this.httpClient
      .get<ApiResponse<PaginatedResponse<ProductItem>>>(AdminProductItemApi.SEARCH, { params })
  }



  /**
   * Create product items from text
   */
  create(data: ProductItemCreate): Observable<ApiResponse<ProductItem>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<ProductItem>>(AdminProductItemApi.CREATE, data)
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Create product items from textarea with ExpirationType
   */
  createWithExpirationType(productId: number, accountData: string, expirationType: string): Observable<ApiResponse<string>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<string>>(AdminProductItemApi.CREATE, {
        productId,
        accountData,
        expirationType
      })
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Delete product item
   */
  delete(id: number): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<void>>(AdminProductItemApi.DELETE(id))
      .pipe(finalize(() => this.loaderService.hide()));
  }

  // ============ BULK OPERATIONS ============

  /**
   * Import items from TXT file with expirationType
   */
  importFile(productId: number | string, file: File, expirationType: string = 'NONE'): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('file', file);

    // Thêm expirationType vào URL params
    const params = new HttpParams().set('expirationType', expirationType);
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<string>>(AdminProductItemApi.IMPORT_TXT(productId), formData, { params })
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Bulk delete items by account data list
   */
  bulkDelete(productId: number | string, accountDataList: string): Observable<ApiResponse<{ deleted: number; message: string }>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<{ deleted: number; message: string }>>(
        AdminProductItemApi.BULK_DELETE(productId),
        { accountDataList }
      )
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Get expired items for export
   */
  getExpiredItems(productId: number | string): Observable<ApiResponse<ProductItem[]>> {
    this.loaderService.show();

    return this.httpClient
      .get<ApiResponse<ProductItem[]>>(AdminProductItemApi.EXPIRED(productId))
      .pipe(finalize(() => this.loaderService.hide()));
  }

  /**
   * Delete all expired items
   */
  deleteExpiredItems(productId: number | string): Observable<ApiResponse<{ deleted: number; message: string }>> {
    this.loaderService.show();

    return this.httpClient
      .delete<ApiResponse<{ deleted: number; message: string }>>(AdminProductItemApi.EXPIRED(productId))
      .pipe(finalize(() => this.loaderService.hide()));
  }
}

