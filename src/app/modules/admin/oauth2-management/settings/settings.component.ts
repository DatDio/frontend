import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SystemSettingService } from '../../../../core/services/system-setting.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
    selector: 'app-oauth2-settings',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss'
})
export class OAuth2SettingsComponent implements OnInit {
    private readonly systemSettingService = inject(SystemSettingService);
    private readonly notificationService = inject(NotificationService);

    loading = false;
    saving = false;

    // Settings
    pricePerAccount = 500;
    resultRetentionDays = 7;
    maxAccountsPerRequest = 100;

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings(): void {
        this.loading = true;
        this.systemSettingService.getAll().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    for (const setting of response.data) {
                        switch (setting.settingKey) {
                            case 'oauth2.price_per_account':
                                this.pricePerAccount = parseInt(setting.settingValue) || 500;
                                break;
                            case 'oauth2.result_retention_days':
                                this.resultRetentionDays = parseInt(setting.settingValue) || 7;
                                break;
                            case 'oauth2.max_accounts_per_request':
                                this.maxAccountsPerRequest = parseInt(setting.settingValue) || 100;
                                break;
                        }
                    }
                }
                this.loading = false;
            },
            error: () => {
                this.notificationService.error('Lỗi khi tải cài đặt');
                this.loading = false;
            }
        });
    }

    saveAllSettings(): void {
        this.saving = true;

        const updates = [
            { key: 'oauth2.price_per_account', value: String(this.pricePerAccount), desc: 'Giá mỗi account get OAuth2 thành công (VND)' },
            { key: 'oauth2.result_retention_days', value: String(this.resultRetentionDays), desc: 'Số ngày lưu kết quả OAuth2' },
            { key: 'oauth2.max_accounts_per_request', value: String(this.maxAccountsPerRequest), desc: 'Số account tối đa mỗi yêu cầu' }
        ];

        Promise.all(
            updates.map(u =>
                this.systemSettingService.update(u.key, { settingValue: u.value, description: u.desc }).toPromise()
            )
        ).then(() => {
            this.notificationService.success('Đã lưu tất cả cài đặt thành công');
            this.saving = false;
        }).catch(() => {
            this.notificationService.error('Lỗi khi lưu cài đặt');
            this.saving = false;
        });
    }
}
