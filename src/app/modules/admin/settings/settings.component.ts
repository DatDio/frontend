import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SystemSettingService } from '../../../core/services/system-setting.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SystemSetting } from '../../../core/models/system-setting.model';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    readonly #settingService = inject(SystemSettingService);
    readonly #notificationService = inject(NotificationService);

    settings: SystemSetting[] = [];
    loading = false;
    editingKey: string | null = null;
    editValue = '';

    // Specific settings
    rankPeriodDays = 7;

    // PayOS settings
    payosClientId = '';
    payosApiKey = '';
    payosChecksumKey = '';
    payosSaving = false;

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings(): void {
        this.loading = true;
        this.#settingService.getAll().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.settings = response.data;
                    this.parseSettings();
                }
                this.loading = false;
            },
            error: (error) => {
                this.#notificationService.error('Không thể tải cài đặt');
                this.loading = false;
            }
        });
    }

    private parseSettings(): void {
        // Rank period
        const rankPeriod = this.settings.find(s => s.settingKey === 'rank.period_days');
        if (rankPeriod) {
            this.rankPeriodDays = parseInt(rankPeriod.settingValue) || 7;
        }

        // PayOS settings
        const clientId = this.settings.find(s => s.settingKey === 'payos.client_id');
        if (clientId) this.payosClientId = clientId.settingValue || '';

        const apiKey = this.settings.find(s => s.settingKey === 'payos.api_key');
        if (apiKey) this.payosApiKey = apiKey.settingValue || '';

        const checksumKey = this.settings.find(s => s.settingKey === 'payos.checksum_key');
        if (checksumKey) this.payosChecksumKey = checksumKey.settingValue || '';
    }

    startEdit(setting: SystemSetting): void {
        this.editingKey = setting.settingKey;
        this.editValue = setting.settingValue;
    }

    cancelEdit(): void {
        this.editingKey = null;
        this.editValue = '';
    }

    saveEdit(setting: SystemSetting): void {
        if (!this.editingKey) return;

        this.#settingService.update(setting.settingKey, {
            settingValue: this.editValue,
            description: setting.description
        }).subscribe({
            next: (response) => {
                if (response.success) {
                    this.#notificationService.success('Cập nhật cài đặt thành công');
                    setting.settingValue = this.editValue;
                    this.parseSettings();
                    this.cancelEdit();
                } else {
                    this.#notificationService.error(response.message || 'Có lỗi xảy ra');
                }
            },
            error: (error) => {
                this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
            }
        });
    }

    saveRankPeriodDays(): void {
        this.#settingService.update('rank.period_days', {
            settingValue: String(this.rankPeriodDays),
            description: 'Số ngày tính tổng nạp để xác định thứ hạng'
        }).subscribe({
            next: (response) => {
                if (response.success) {
                    this.#notificationService.success('Cập nhật thành công');
                    this.loadSettings();
                } else {
                    this.#notificationService.error(response.message || 'Có lỗi xảy ra');
                }
            },
            error: (error) => {
                this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
            }
        });
    }

    getSettingLabel(key: string): string {
        const labels: Record<string, string> = {
            'rank.period_days': 'Số ngày tính hạng',
            'payos.client_id': 'PayOS Client ID',
            'payos.api_key': 'PayOS API Key',
            'payos.checksum_key': 'PayOS Checksum Key'
        };
        return labels[key] || key;
    }

    savePayOSSettings(): void {
        this.payosSaving = true;

        // Save all 3 settings in sequence
        const saveClientId = () => this.#settingService.update('payos.client_id', {
            settingValue: this.payosClientId,
            description: 'PayOS Client ID'
        }).toPromise();

        const saveApiKey = () => this.#settingService.update('payos.api_key', {
            settingValue: this.payosApiKey,
            description: 'PayOS API Key'
        }).toPromise();

        const saveChecksumKey = () => this.#settingService.update('payos.checksum_key', {
            settingValue: this.payosChecksumKey,
            description: 'PayOS Checksum Key'
        }).toPromise();

        Promise.all([saveClientId(), saveApiKey(), saveChecksumKey()])
            .then(() => {
                this.#notificationService.success('Lưu cấu hình PayOS thành công');
                this.loadSettings();
            })
            .catch((error) => {
                this.#notificationService.error('Lỗi khi lưu cấu hình PayOS');
            })
            .finally(() => {
                this.payosSaving = false;
            });
    }
}
