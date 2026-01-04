import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { CommonApi } from '../../../Utils/apis/commom.api';

interface TwoFAResult {
    identifier: string;
    secret: string;
    code: string;
    status: 'success' | 'error' | 'generating';
    timeRemaining: number;
    error?: string;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

@Component({
    selector: 'app-get-2fa',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './get-2fa.component.html',
    styleUrls: ['./get-2fa.component.scss']
})
export class Get2FAComponent implements OnInit, OnDestroy {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly http = inject(HttpClient);
    private readonly seoService = inject(SeoService);

    private readonly API_BASE = `${CommonApi.CONTEXT_PATH}/tools/totp`;

    getForm!: FormGroup;
    isLoading = false;
    results: TwoFAResult[] = [];
    showResults = false;
    private intervalId: any;

    // Copy state tracking
    copiedCode: string | null = null;
    private copyTimeout: any;

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Lấy Mã 2FA - EmailSieuRe',
            'Công cụ lấy mã xác thực 2 bước (TOTP) từ secret key nhanh chóng và tự động cập nhật.',
            'get 2FA, TOTP, mã xác thực, two-factor authentication, EmailSieuRe'
        );
        this.initForm();
    }

    ngOnDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }
    }

    private initForm(): void {
        this.getForm = this.formBuilder.group({
            secretData: ['', [Validators.required, Validators.minLength(5)]]
        });
    }

    get itemCount(): number {
        const data = this.getForm.get('secretData')?.value || '';
        return data.trim().split('\n').filter((line: string) => line.trim().length > 0).length;
    }

    onGet(): void {
        if (this.getForm.invalid) {
            this.notificationService.warning('Vui lòng nhập danh sách 2FA secret');
            return;
        }

        this.isLoading = true;
        this.showResults = true;
        const secretData = this.getForm.get('secretData')?.value.trim();

        // Set all items to generating state
        const lines = secretData.split('\n').filter((line: string) => line.trim().length > 0);
        this.results = lines.map((line: string) => ({
            identifier: line.trim().substring(0, 15) + (line.length > 15 ? '...' : ''),
            secret: line.trim(),
            code: '',
            status: 'generating' as const,
            timeRemaining: 30
        }));

        // Call backend API
        this.generateCodesFromBackend(secretData);
    }

    private generateCodesFromBackend(secretData: string): void {
        this.http.post<ApiResponse<TwoFAResult[]>>(`${this.API_BASE}/generate`, { secretData })
            .subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.results = response.data;
                        const successCount = this.results.filter(r => r.status === 'success').length;
                        this.notificationService.success(`Đã tạo ${successCount}/${this.results.length} mã 2FA`);

                        // Start countdown timer
                        this.startTimer();
                    } else {
                        this.notificationService.error('Có lỗi khi tạo mã 2FA');
                    }
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Error generating TOTP:', error);
                    this.notificationService.error('Có lỗi khi kết nối server');
                    this.results = this.results.map(r => ({
                        ...r,
                        status: 'error' as const,
                        error: 'Connection error'
                    }));
                    this.isLoading = false;
                }
            });
    }

    private startTimer(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        // Update time remaining every second
        this.intervalId = setInterval(() => {
            const currentSecond = Math.floor(Date.now() / 1000) % 30;
            const remaining = 30 - currentSecond;

            this.results = this.results.map(result => ({
                ...result,
                timeRemaining: remaining
            }));

            // Regenerate codes when timer resets
            if (remaining === 30) {
                this.refreshCodesFromBackend();
            }
        }, 1000);
    }

    private refreshCodesFromBackend(): void {
        const secrets = this.results.map(r => r.secret).join('\n');

        this.http.post<ApiResponse<TwoFAResult[]>>(`${this.API_BASE}/generate`, { secretData: secrets })
            .subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.results = response.data;
                    }
                },
                error: (error) => {
                    console.error('Error refreshing TOTP:', error);
                }
            });
    }

    copyCode(code: string): void {
        navigator.clipboard.writeText(code).then(() => {
            if (this.copyTimeout) {
                clearTimeout(this.copyTimeout);
            }
            this.copiedCode = code;
            this.notificationService.success('Đã copy mã 2FA!');
            this.copyTimeout = setTimeout(() => {
                this.copiedCode = null;
            }, 2000);
        });
    }

    clearResults(): void {
        this.results = [];
        this.showResults = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    refreshCodes(): void {
        this.refreshCodesFromBackend();
    }

    get successCount(): number {
        return this.results.filter(r => r.status === 'success').length;
    }

    get errorCount(): number {
        return this.results.filter(r => r.status === 'error').length;
    }
}

