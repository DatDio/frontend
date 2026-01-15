import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.model';
import { SpamApi } from '../../Utils/apis/spam/spam.api';

export interface BlockedUser {
    userId: number;
    email: string;
    blockedSecondsRemaining: number;
    blockedUntil: string;
    reason: string;
}

@Injectable({
    providedIn: 'root'
})
export class SpamProtectionService {
    private readonly httpClient = inject(HttpClient);

    /**
     * Get list of currently blocked users
     */
    getBlockedUsers(): Observable<ApiResponse<BlockedUser[]>> {
        return this.httpClient.get<ApiResponse<BlockedUser[]>>(SpamApi.BLOCKED_USERS);
    }

    /**
     * Unblock a user manually
     */
    unblockUser(userId: number): Observable<ApiResponse<string>> {
        return this.httpClient.post<ApiResponse<string>>(`${SpamApi.UNBLOCK}/${userId}`, {});
    }
}
