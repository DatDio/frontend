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
        const rankPeriod = this.settings.find(s => s.settingKey === 'rank.period_days');
        if (rankPeriod) {
            this.rankPeriodDays = parseInt(rankPeriod.settingValue) || 7;
        }
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
            'rank.period_days': 'Số ngày tính hạng'
        };
        return labels[key] || key;
    }
}
