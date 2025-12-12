import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { SystemSetting, SystemSettingCreate, SystemSettingUpdate } from '../models/system-setting.model';
import { ApiResponse } from '../models/common.model';
import { AdminSettingApi } from '../../Utils/apis/settings/admin-setting.api';

@Injectable({
    providedIn: 'root'
})
export class SystemSettingService {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    /**
     * Get all system settings (admin)
     */
    getAll(): Observable<ApiResponse<SystemSetting[]>> {
        return this.httpClient.get<ApiResponse<SystemSetting[]>>(AdminSettingApi.GET_ALL);
    }

    /**
     * Get setting by key (admin)
     */
    getByKey(key: string): Observable<ApiResponse<SystemSetting>> {
        return this.httpClient.get<ApiResponse<SystemSetting>>(AdminSettingApi.GET_BY_KEY(key));
    }

    /**
     * Create new setting (admin)
     */
    create(data: SystemSettingCreate): Observable<ApiResponse<SystemSetting>> {
        this.loaderService.show();
        return this.httpClient
            .post<ApiResponse<SystemSetting>>(AdminSettingApi.CREATE, data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Update setting (admin)
     */
    update(key: string, data: SystemSettingUpdate): Observable<ApiResponse<SystemSetting>> {
        this.loaderService.show();
        return this.httpClient
            .put<ApiResponse<SystemSetting>>(AdminSettingApi.UPDATE(key), data)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Delete setting (admin)
     */
    delete(key: string): Observable<ApiResponse<void>> {
        this.loaderService.show();
        return this.httpClient
            .delete<ApiResponse<void>>(AdminSettingApi.DELETE(key))
            .pipe(finalize(() => this.loaderService.hide()));
    }
}
