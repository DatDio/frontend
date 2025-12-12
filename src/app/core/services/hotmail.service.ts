import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from './loader.service';
import {
    HotmailGetCodeRequest,
    HotmailGetCodeResponse,
    CheckLiveMailRequest,
    CheckLiveMailResponse,
    GetOAuth2Request,
    GetOAuth2Response
} from '../models/hotmail.model';
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

    /**
     * Check if email accounts are live
     * @param request - Contains email credentials
     * @returns Observable with list of results with live/die status
     */
    checkLiveMail(request: CheckLiveMailRequest): Observable<ApiResponse<CheckLiveMailResponse[]>> {
        this.loaderService.show();

        return this.httpClient
            .post<ApiResponse<CheckLiveMailResponse[]>>(HotmailApi.CHECK_LIVE_MAIL, request)
            .pipe(finalize(() => this.loaderService.hide()));
    }

    /**
     * Get OAuth2 access token from refresh token
     * @param request - Contains email credentials with refresh token
     * @returns Observable with list of results with access tokens
     */
    getOAuth2Token(request: GetOAuth2Request): Observable<ApiResponse<GetOAuth2Response[]>> {
        this.loaderService.show();

        return this.httpClient
            .post<ApiResponse<GetOAuth2Response[]>>(HotmailApi.GET_OAUTH2, request)
            .pipe(finalize(() => this.loaderService.hide()));
    }
}
