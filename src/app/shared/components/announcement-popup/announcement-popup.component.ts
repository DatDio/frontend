import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AnnouncementService, AnnouncementDTO } from '../../../core/services/announcement.service';
import { ApiResponse } from '../../../core/models/common.model';

@Component({
    selector: 'app-announcement-popup',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './announcement-popup.component.html',
    styleUrls: ['./announcement-popup.component.scss']
})
export class AnnouncementPopupComponent implements OnInit {
    announcement: AnnouncementDTO | null = null;
    showPopup = false;
    currentLang: string;
    private readonly STORAGE_KEY = 'announcement_dismissed';

    constructor(
        private announcementService: AnnouncementService,
        private translate: TranslateService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'vi';
    }

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Fetch active announcement
        this.announcementService.getActiveAnnouncement().subscribe({
            next: (response: ApiResponse<AnnouncementDTO>) => {
                if (response.success && response.data) {
                    this.announcement = response.data;
                    this.checkAndShowPopup();
                }
            },
            error: (error: any) => {
                console.error('Error loading announcement:', error);
            }
        });

        // Listen to language changes
        this.translate.onLangChange.subscribe((event) => {
            this.currentLang = event.lang;
        });
    }

    private checkAndShowPopup(): void {
        if (!this.announcement) return;

        const storedData = localStorage.getItem(this.STORAGE_KEY);
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                const threeHours = 3 * 60 * 60 * 1000;
                const now = new Date().getTime();

                // Logical Check:
                // 1. If announcement has a new updatedAt compare to stored one -> SHOW (Admin updated content)
                // 2. If 3 hours passed -> SHOW (Session expired)

                const isContentUpdated = this.announcement.updatedAt && data.updatedAt !== this.announcement.updatedAt;
                const isTimeExpired = now - data.dismissedAt >= threeHours;

                if (!isContentUpdated && !isTimeExpired) {
                    return; // Don't show
                }
            } catch (e) {
                // If parse error, assume invalid data and show popup (will be overwritten on close)
                console.error('Error parsing stored announcement data', e);
            }
        }

        this.showPopup = true;
    }

    get title(): string {
        if (!this.announcement) return '';
        return this.currentLang === 'vi' ? this.announcement.titleVi : this.announcement.titleEn;
    }

    get content(): string {
        if (!this.announcement) return '';
        return this.currentLang === 'vi' ? this.announcement.contentVi : this.announcement.contentEn;
    }

    closePopup(doNotShowAgain: boolean = false): void {
        this.showPopup = false;


        if (doNotShowAgain && this.announcement) {
            const data = {
                dismissedAt: new Date().getTime(),
                updatedAt: this.announcement.updatedAt // Store the version of announcement being dismissed
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        }
    }
}
