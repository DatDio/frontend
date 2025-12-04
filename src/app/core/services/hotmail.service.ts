import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import { HotmailGetCodeRequest, HotmailGetCodeResponse } from '../models/hotmail.model';
import { ApiResponse } from '../models/common.model';
import { HotmailApi } from '../../Utils/apis/hotmail/hotmail.api';

@Injectable({
    providedIn: 'root'
})
export class HotmailService {
    private readonly httpClient = inject(HttpClient);
    private readonly loaderService = inject(LoaderService);

    /**
     * Get verification code from Hotmail inbox
     * @param request - Contains email credentials and settings
     * @returns Observable with list of emails containing verification codes
     */
    getCode(request: HotmailGetCodeRequest): Observable<ApiResponse<HotmailGetCodeResponse[]>> {
        this.loaderService.show();

        return this.httpClient
            .post<ApiResponse<HotmailGetCodeResponse[]>>(HotmailApi.GET_CODE, request)
            .pipe(finalize(() => this.loaderService.hide()));
    }
}
