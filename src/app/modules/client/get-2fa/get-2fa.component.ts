import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { NotificationService } from '../../../core/services/notification.service';

interface TwoFAResult {
    email: string;
    secret: string;
    code: string;
    status: 'success' | 'error' | 'generating';
    timeRemaining: number;
    error?: string;
}

@Component({
    selector: 'app-get-2fa',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './get-2fa.component.html',
    styleUrls: ['./get-2fa.component.scss']
})
export class Get2FAComponent implements OnInit {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);

    getForm!: FormGroup;
    isLoading = false;
    results: TwoFAResult[] = [];
    showResults = false;
    private intervalId: any;

    ngOnInit(): void {
        this.initForm();
    }

    ngOnDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
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
        const lines = secretData.split('\n').filter((line: string) => line.trim().length > 0);

        // Parse data - format: email|password|2fa_secret or just secret
        this.results = lines.map((line: string) => {
            const parts = line.split('|');
            let email = '';
            let secret = '';

            if (parts.length >= 3) {
                email = parts[0]?.trim() || '';
                secret = parts[2]?.trim() || ''; // 2FA secret is the 3rd part
            } else {
                secret = parts[0]?.trim() || '';
            }

            return {
                email: email || secret.substring(0, 10) + '...',
                secret: secret,
                code: '',
                status: 'generating' as const,
                timeRemaining: 30
            };
        });

        // Generate 2FA codes
        this.generateCodes();
        this.isLoading = false;

        // Start countdown timer
        this.startTimer();
    }

    private generateCodes(): void {
        this.results = this.results.map(result => {
            try {
                const code = this.generateTOTP(result.secret);
                return {
                    ...result,
                    code: code,
                    status: 'success' as const,
                    timeRemaining: 30 - (Math.floor(Date.now() / 1000) % 30)
                };
            } catch (e) {
                return {
                    ...result,
                    status: 'error' as const,
                    error: 'Invalid secret'
                };
            }
        });

        const successCount = this.results.filter(r => r.status === 'success').length;
        this.notificationService.success(`Đã tạo ${successCount}/${this.results.length} mã 2FA`);
    }

    private generateTOTP(secret: string): string {
        // Simple TOTP generation - for demo purposes
        // In production, use a proper library like otplib
        const epoch = Math.floor(Date.now() / 1000 / 30);
        const hash = this.simpleHash(secret + epoch.toString());
        const code = (hash % 1000000).toString().padStart(6, '0');
        return code;
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    private startTimer(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            const currentSecond = Math.floor(Date.now() / 1000) % 30;
            const remaining = 30 - currentSecond;

            this.results = this.results.map(result => ({
                ...result,
                timeRemaining: remaining
            }));

            // Regenerate codes when timer resets
            if (remaining === 30) {
                this.generateCodes();
            }
        }, 1000);
    }

    copyCode(code: string): void {
        navigator.clipboard.writeText(code).then(() => {
            this.notificationService.success('Đã copy mã 2FA!');
        });
    }

    copyAll(): void {
        const codes = this.results
            .filter(r => r.status === 'success')
            .map(r => `${r.email}|${r.code}`)
            .join('\n');
        if (!codes) {
            this.notificationService.warning('Không có mã nào để copy');
            return;
        }
        navigator.clipboard.writeText(codes).then(() => {
            this.notificationService.success('Đã copy tất cả mã 2FA!');
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
        this.generateCodes();
    }

    get successCount(): number {
        return this.results.filter(r => r.status === 'success').length;
    }

    get errorCount(): number {
        return this.results.filter(r => r.status === 'error').length;
    }
}
