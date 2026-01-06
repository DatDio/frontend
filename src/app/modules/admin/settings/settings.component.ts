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

    // Casso settings
    cassoSecureToken = '';
    cassoBankCode = '';
    cassoBankAccount = '';
    cassoAccountName = '';
    cassoSaving = false;
    showSecureToken = false;

    // Social settings
    telegramGroupUrl = '';
    telegramChannelUrl = '';
    socialSaving = false;

    // Scheduler settings
    transactionTimeoutMinutes = 10;
    orderCleanupDays = 3;

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

        // Casso settings
        const secureToken = this.settings.find(s => s.settingKey === 'casso.secure_token');
        if (secureToken) this.cassoSecureToken = secureToken.settingValue || '';

        const bankCode = this.settings.find(s => s.settingKey === 'casso.bank_code');
        if (bankCode) this.cassoBankCode = bankCode.settingValue || '';

        const bankAccount = this.settings.find(s => s.settingKey === 'casso.bank_account');
        if (bankAccount) this.cassoBankAccount = bankAccount.settingValue || '';

        const accountName = this.settings.find(s => s.settingKey === 'casso.account_name');
        if (accountName) this.cassoAccountName = accountName.settingValue || '';

        // Social settings
        const telegramGroup = this.settings.find(s => s.settingKey === 'social.telegram_group');
        if (telegramGroup) this.telegramGroupUrl = telegramGroup.settingValue || '';

        const telegramChannel = this.settings.find(s => s.settingKey === 'social.telegram_channel');
        if (telegramChannel) this.telegramChannelUrl = telegramChannel.settingValue || '';

        // Scheduler settings
        const transactionTimeout = this.settings.find(s => s.settingKey === 'scheduler.transaction_timeout_minutes');
        if (transactionTimeout) this.transactionTimeoutMinutes = parseInt(transactionTimeout.settingValue) || 10;

        const orderCleanup = this.settings.find(s => s.settingKey === 'scheduler.order_cleanup_days');
        if (orderCleanup) this.orderCleanupDays = parseInt(orderCleanup.settingValue) || 3;
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
            'payos.checksum_key': 'PayOS Checksum Key',
            'casso.secure_token': 'Casso Secure Token',
            'casso.bank_code': 'Casso Mã Ngân Hàng',
            'casso.bank_account': 'Casso Số Tài Khoản',
            'casso.account_name': 'Casso Tên Chủ TK',
            'social.telegram_group': 'Link Telegram Nhóm Chat',
            'social.telegram_channel': 'Link Liên Hệ Admin'
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

    saveCassoSettings(): void {
        this.cassoSaving = true;

        const saveSecureToken = () => this.#settingService.update('casso.secure_token', {
            settingValue: this.cassoSecureToken,
            description: 'Casso Secure Token (cho webhook verification)'
        }).toPromise();

        const saveBankCode = () => this.#settingService.update('casso.bank_code', {
            settingValue: this.cassoBankCode,
            description: 'Mã ngân hàng (VD: ACB, VCB, TCB, MB...)'
        }).toPromise();

        const saveBankAccount = () => this.#settingService.update('casso.bank_account', {
            settingValue: this.cassoBankAccount,
            description: 'Số tài khoản ngân hàng nhận tiền'
        }).toPromise();

        const saveAccountName = () => this.#settingService.update('casso.account_name', {
            settingValue: this.cassoAccountName,
            description: 'Tên chủ tài khoản (không dấu, viết hoa)'
        }).toPromise();

        Promise.all([saveSecureToken(), saveBankCode(), saveBankAccount(), saveAccountName()])
            .then(() => {
                this.#notificationService.success('Lưu cấu hình Casso thành công');
                this.loadSettings();
            })
            .catch((error) => {
                this.#notificationService.error('Lỗi khi lưu cấu hình Casso');
            })
            .finally(() => {
                this.cassoSaving = false;
            });
    }

    saveSocialSettings(): void {
        this.socialSaving = true;

        const saveTelegramGroup = () => this.#settingService.update('social.telegram_group', {
            settingValue: this.telegramGroupUrl,
            description: 'Link Telegram nhóm chat hỗ trợ'
        }).toPromise();

        const saveTelegramChannel = () => this.#settingService.update('social.telegram_channel', {
            settingValue: this.telegramChannelUrl,
            description: 'Link liên hệ admin'
        }).toPromise();

        Promise.all([saveTelegramGroup(), saveTelegramChannel()])
            .then(() => {
                this.#notificationService.success('Lưu cấu hình liên kết thành công');
                this.loadSettings();
            })
            .catch((error) => {
                this.#notificationService.error('Lỗi khi lưu cấu hình liên kết');
            })
            .finally(() => {
                this.socialSaving = false;
            });
    }

    // ========== SCHEDULER SETTINGS ==========
    saveTransactionTimeout(): void {
        this.#settingService.update('scheduler.transaction_timeout_minutes', {
            settingValue: String(this.transactionTimeoutMinutes),
            description: 'Thời gian timeout giao dịch thanh toán (phút)'
        }).subscribe({
            next: (response) => {
                if (response.success) {
                    this.#notificationService.success('Cập nhật thời gian timeout thành công');
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

    saveOrderCleanupDays(): void {
        this.#settingService.update('scheduler.order_cleanup_days', {
            settingValue: String(this.orderCleanupDays),
            description: 'Số ngày xoá đơn hàng cũ'
        }).subscribe({
            next: (response) => {
                if (response.success) {
                    this.#notificationService.success('Cập nhật số ngày xoá đơn hàng thành công');
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
}

