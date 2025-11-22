import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { Category, CategoryCreate, CategoryFilter, CategoryUpdate } from '../models/category.model';
import { ApiResponse, PaginatedResponse } from '../models/common.model';
import { AdminCategoryApi } from '../../Utils/apis/categories/admin-category.api';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    /**
     * Get list of categories
     */
    list(filter?: CategoryFilter): Observable<ApiResponse<PaginatedResponse<Category>>> {
        this.loaderService.show();

        const params = this.createCategoryFilter(filter);

        return this.httpClient
            .get<ApiResponse<PaginatedResponse<Category>>>(AdminCategoryApi.SEARCH, {
                params: params
            })
            .pipe(
                finalize(() => this.loaderService.hide())
            );
    }

    // ===== FILTER BUILDER =====
    private createCategoryFilter(filter?: CategoryFilter): HttpParams {
        let params = new HttpParams();

        if (!filter) return params;

        if (filter.name) params = params.set('name', filter.name);
        if (filter.status) params = params.set('status', filter.status);

        params = params
            .set('page', (filter.page ?? null).toString())
            .set('limit', (filter.limit ?? null).toString())
            .set('sort', filter.sort ?? 'createdAt,desc');

        return params;
    }
    /**
     * Get category by ID
     */
    getById(id: number | string): Observable<ApiResponse<Category>> {
        this.loaderService.show();

        return this.httpClient
            .get<ApiResponse<Category>>(AdminCategoryApi.GET_BY_ID(id))
            .pipe(
                finalize(() => this.loaderService.hide())
            );
    }

    /**
     * Create new category
     */
    create(data: CategoryCreate): Observable<ApiResponse<Category>> {
        this.loaderService.show();

        return this.httpClient
            .post<ApiResponse<Category>>(AdminCategoryApi.CREATE, data)
            .pipe(
                finalize(() => this.loaderService.hide())
            );
    }

    /**
     * Update category
     */
    update(data: CategoryUpdate): Observable<ApiResponse<Category>> {
        this.loaderService.show();

        return this.httpClient
            .put<ApiResponse<Category>>(AdminCategoryApi.UPDATE(data.id), data)
            .pipe(
                finalize(() => this.loaderService.hide())
            );
    }

    /**
     * Delete category
     */
    delete(id: number | string): Observable<ApiResponse<void>> {
        this.loaderService.show();

        return this.httpClient
            .post<ApiResponse<void>>(AdminCategoryApi.DELETE, { id })
            .pipe(
                finalize(() => this.loaderService.hide())
            );
    }
}
