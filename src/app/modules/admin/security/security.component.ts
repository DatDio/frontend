import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SystemSettingService } from '../../../core/services/system-setting.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SpamProtectionService, BlockedUser } from '../../../core/services/spam-protection.service';

@Component({
    selector: 'app-security',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './security.component.html',
    styleUrls: ['./security.component.scss']
})
export class SecurityComponent implements OnInit {
    readonly #settingService = inject(SystemSettingService);
    readonly #notificationService = inject(NotificationService);
    readonly #spamService = inject(SpamProtectionService);

    loading = false;

    // Spam protection settings
    spamMaxAttempts = 5;
    spamBlockMinutes = 30;
    spamWindowMinutes = 1;
    spamSaving = false;

    // Blocked users management
    blockedUsers: BlockedUser[] = [];
    loadingBlockedUsers = false;
    unblockingUserId: number | null = null;

    ngOnInit(): void {
        this.loadSettings();
        this.loadBlockedUsers();
    }

    loadSettings(): void {
        this.loading = true;
        this.#settingService.getAll().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const settings = response.data;

                    const spamMaxAttempts = settings.find(s => s.settingKey === 'SPAM_INSUFFICIENT_BALANCE_MAX_ATTEMPTS');
                    if (spamMaxAttempts) this.spamMaxAttempts = parseInt(spamMaxAttempts.settingValue) || 5;

                    const spamBlockMinutes = settings.find(s => s.settingKey === 'SPAM_INSUFFICIENT_BALANCE_BLOCK_MINUTES');
                    if (spamBlockMinutes) this.spamBlockMinutes = parseInt(spamBlockMinutes.settingValue) || 30;

                    const spamWindowMinutes = settings.find(s => s.settingKey === 'SPAM_INSUFFICIENT_BALANCE_WINDOW_MINUTES');
                    if (spamWindowMinutes) this.spamWindowMinutes = parseInt(spamWindowMinutes.settingValue) || 10;
                }
                this.loading = false;
            },
            error: () => {
                this.#notificationService.error('Không thể tải cài đặt');
                this.loading = false;
            }
        });
    }

    saveSpamSettings(): void {
        this.spamSaving = true;

        const saveMaxAttempts = () => this.#settingService.update('SPAM_INSUFFICIENT_BALANCE_MAX_ATTEMPTS', {
            settingValue: String(this.spamMaxAttempts),
            description: 'Số lần mua thất bại do thiếu tiền trước khi bị khóa'
        }).toPromise();

        const saveBlockMinutes = () => this.#settingService.update('SPAM_INSUFFICIENT_BALANCE_BLOCK_MINUTES', {
            settingValue: String(this.spamBlockMinutes),
            description: 'Thời gian khóa user (phút) khi vượt ngưỡng spam'
        }).toPromise();

        const saveWindowMinutes = () => this.#settingService.update('SPAM_INSUFFICIENT_BALANCE_WINDOW_MINUTES', {
            settingValue: String(this.spamWindowMinutes),
            description: 'Cửa sổ thời gian (phút) để đếm số lần thất bại'
        }).toPromise();

        Promise.all([saveMaxAttempts(), saveBlockMinutes(), saveWindowMinutes()])
            .then(() => {
                this.#notificationService.success('Lưu cấu hình chống Spam thành công');
                this.loadSettings();
            })
            .catch(() => {
                this.#notificationService.error('Lỗi khi lưu cấu hình chống Spam');
            })
            .finally(() => {
                this.spamSaving = false;
            });
    }

    loadBlockedUsers(): void {
        this.loadingBlockedUsers = true;
        this.#spamService.getBlockedUsers().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.blockedUsers = response.data;
                }
                this.loadingBlockedUsers = false;
            },
            error: (error: { error?: { message?: string } }) => {
                console.error('Error loading blocked users:', error);
                this.loadingBlockedUsers = false;
            }
        });
    }

    unblockUser(userId: number): void {
        this.unblockingUserId = userId;
        this.#spamService.unblockUser(userId).subscribe({
            next: (response) => {
                if (response.success) {
                    this.#notificationService.success('Đã mở khóa user thành công');
                    this.loadBlockedUsers();
                } else {
                    this.#notificationService.error(response.message || 'Có lỗi xảy ra');
                }
                this.unblockingUserId = null;
            },
            error: (error: { error?: { message?: string } }) => {
                this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
                this.unblockingUserId = null;
            }
        });
    }

    formatSeconds(seconds: number): string {
        if (seconds < 60) return `${seconds} giây`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes < 60) return `${minutes} phút ${remainingSeconds} giây`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours} giờ ${remainingMinutes} phút`;
    }
}
