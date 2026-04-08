import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MailsNgonBalance, MailsNgonService, MailsNgonSettings } from '../../../../core/services/mailsngon.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
    selector: 'app-mailsngon-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss'
})
export class MailsNgonSettingsComponent implements OnInit {
    private readonly mailsNgonService = inject(MailsNgonService);
    private readonly notificationService = inject(NotificationService);

    loading = false;
    saving = false;
    testing = false;
    loadingBalance = false;

    settings: MailsNgonSettings = {
        enabled: false,
        autoSyncEnabled: false,
        syncIntervalSeconds: 300
    };
    balance: MailsNgonBalance | null = null;

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings(): void {
        this.loading = true;
        this.mailsNgonService.getSettings().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.settings = {
                        ...response.data,
                        syncIntervalSeconds: response.data.syncIntervalSeconds || 300
                    };
                    if (this.settings.hasApiKey) {
                        this.loadBalance();
                    }
                }
                this.loading = false;
            },
            error: () => {
                this.notificationService.error('Lỗi khi tải cài đặt MailsNgon');
                this.loading = false;
            }
        });
    }

    saveSettings(): void {
        this.saving = true;
        const payload: MailsNgonSettings = {
            enabled: !!this.settings.enabled,
            autoSyncEnabled: !!this.settings.autoSyncEnabled,
            syncIntervalSeconds: Math.max(5, Number(this.settings.syncIntervalSeconds || 300)),
            apiKey: (this.settings.apiKey || '').trim() || undefined
        };

        this.mailsNgonService.updateSettings(payload).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.settings = {
                        ...response.data,
                        syncIntervalSeconds: response.data.syncIntervalSeconds || 300
                    };
                    this.notificationService.success('Đã lưu cài đặt MailsNgon');
                    if (this.settings.hasApiKey) {
                        this.loadBalance();
                    } else {
                        this.balance = null;
                    }
                }
                this.saving = false;
            },
            error: (error) => {
                this.notificationService.error(error?.error?.message || 'Lỗi khi lưu cài đặt MailsNgon');
                this.saving = false;
            }
        });
    }

    testConnection(): void {
        this.testing = true;
        this.mailsNgonService.testConnection().subscribe({
            next: (response) => {
                const result = response.data;
                if (response.success && result?.success) {
                    this.notificationService.success(result.message || 'Kết nối MailsNgon thành công');
                    this.loadBalance();
                } else {
                    this.notificationService.error(result?.message || 'Kết nối MailsNgon thất bại');
                }
                this.testing = false;
            },
            error: (error) => {
                this.notificationService.error(error?.error?.message || 'Kết nối MailsNgon thất bại');
                this.testing = false;
            }
        });
    }

    loadBalance(): void {
        this.loadingBalance = true;
        this.mailsNgonService.getBalance().subscribe({
            next: (response) => {
                if (response.success) {
                    this.balance = response.data || null;
                }
                this.loadingBalance = false;
            },
            error: () => {
                this.balance = null;
                this.loadingBalance = false;
            }
        });
    }

    formatCurrency(value?: number): string {
        if (value == null) return '—';
        return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    }
}
