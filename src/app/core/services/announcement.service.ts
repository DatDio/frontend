import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/common.model';
import { AdminAnnouncementApi } from '../../Utils/apis/settings/admin-announcement.api';
import { PublicSettingApi } from '../../Utils/apis/settings/public-setting.api';

export interface AnnouncementDTO {
    id?: number;
    titleVi: string;
    titleEn: string;
    contentVi: string;
    contentEn: string;
    isActive: boolean;
    updatedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AnnouncementService {

    constructor(private http: HttpClient) { }

    /**
     * Get active announcement for public display
     */
    getActiveAnnouncement(): Observable<ApiResponse<AnnouncementDTO>> {
        return this.http.get<ApiResponse<AnnouncementDTO>>(PublicSettingApi.GET_ANNOUNCEMENT_ACTIVE);
    }

    /**
     * Admin: Get announcement
     */
    getAnnouncement(): Observable<ApiResponse<AnnouncementDTO>> {
        return this.http.get<ApiResponse<AnnouncementDTO>>(AdminAnnouncementApi.GET);
    }

    /**
     * Admin: Save announcement (create or update)
     */
    saveAnnouncement(data: AnnouncementDTO): Observable<ApiResponse<AnnouncementDTO>> {
        return this.http.post<ApiResponse<AnnouncementDTO>>(AdminAnnouncementApi.SAVE, data);
    }

    /**
     * Admin: Toggle active status
     */
    toggleActive(): Observable<ApiResponse<AnnouncementDTO>> {
        return this.http.patch<ApiResponse<AnnouncementDTO>>(AdminAnnouncementApi.TOGGLE, {});
    }
}
