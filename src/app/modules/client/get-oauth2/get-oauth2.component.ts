import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';

import { NotificationService } from '../../../core/services/notification.service';
import { HotmailService } from '../../../core/services/hotmail.service';
import { finalize } from 'rxjs/operators';

interface OAuth2Result {
    email: string;
    password: string;
    refreshToken: string;
    clientId: string;
    accessToken?: string;
    status: 'success' | 'error' | 'getting';
    error?: string;
}

@Component({
    selector: 'app-get-oauth2',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './get-oauth2.component.html',
    styleUrls: ['./get-oauth2.component.scss']
})
export class GetOAuth2Component implements OnInit {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly hotmailService = inject(HotmailService);

    getForm!: FormGroup;
    isLoading = false;
    results: OAuth2Result[] = [];
    showResults = false;
    removeDuplicate = true;

    ngOnInit(): void {
        this.initForm();
    }

    private initForm(): void {
        this.getForm = this.formBuilder.group({
            emailData: ['', [Validators.required, Validators.minLength(10)]]
        });
    }

    get emailCount(): number {
        const data = this.getForm.get('emailData')?.value || '';
        return data.trim().split('\n').filter((line: string) => line.trim().length > 0).length;
    }

    onGet(): void {
        if (this.getForm.invalid) {
            this.notificationService.warning('Vui lòng nhập danh sách email');
            return;
        }

        this.isLoading = true;
        this.showResults = true;
        let emailData = this.getForm.get('emailData')?.value.trim();

        // Remove duplicates if enabled
        if (this.removeDuplicate) {
            const lines = emailData.split('\n').filter((line: string) => line.trim().length > 0);
            emailData = [...new Set(lines)].join('\n');
        }

        // Initialize results with getting status
        const lines = emailData.split('\n').filter((line: string) => line.trim().length > 0);
        this.results = lines.map((line: string) => {
            const parts = line.split('|');
            return {
                email: parts[0]?.trim() || '',
                password: parts[1]?.trim() || '',
                refreshToken: parts[2]?.trim() || '',
                clientId: parts[3]?.trim() || '',
                status: 'getting' as const
            };
        });

        // Call backend API to get OAuth2 tokens
        const request = { emailData };
        this.hotmailService.getOAuth2Token(request)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.results = response.data.map(r => ({
                            email: r.email,
                            password: r.password || '',
                            refreshToken: r.refreshToken || '',
                            clientId: r.clientId || '',
                            accessToken: r.accessToken,
                            status: r.success ? 'success' as const : 'error' as const,
                            error: r.error
                        }));
                        const successCount = this.results.filter(r => r.status === 'success').length;
                        this.notificationService.success(`Hoàn thành: ${successCount}/${this.results.length} thành công`);
                    } else {
                        this.notificationService.error(response.message || 'Không thể lấy OAuth2 token');
                    }
                },
                error: (error) => {
                    this.notificationService.error(error.error?.message || 'Đã xảy ra lỗi khi lấy token');
                }
            });
    }

    copyToken(token: string): void {
        navigator.clipboard.writeText(token).then(() => {
            this.notificationService.success('Đã copy access token!');
        });
    }

    copyAllSuccess(): void {
        const successTokens = this.results
            .filter(r => r.status === 'success')
            .map(r => `${r.email}|${r.password}|${r.accessToken}`)
            .join('\n');
        if (!successTokens) {
            this.notificationService.warning('Không có token nào');
            return;
        }
        navigator.clipboard.writeText(successTokens).then(() => {
            this.notificationService.success('Đã copy tất cả access tokens!');
        });
    }

    copyAllError(): void {
        const errorEmails = this.results
            .filter(r => r.status === 'error')
            .map(r => `${r.email}|${r.password}|${r.refreshToken}|${r.clientId}`)
            .join('\n');
        if (!errorEmails) {
            this.notificationService.warning('Không có email lỗi nào');
            return;
        }
        navigator.clipboard.writeText(errorEmails).then(() => {
            this.notificationService.success('Đã copy tất cả email lỗi!');
        });
    }

    filter(): void {
        // Filter out error emails from textarea
        const successEmails = this.results
            .filter(r => r.status === 'success')
            .map(r => `${r.email}|${r.password}|${r.refreshToken}|${r.clientId}`)
            .join('\n');
        this.getForm.patchValue({ emailData: successEmails });
        this.notificationService.success('Đã lọc, chỉ giữ lại email thành công');
    }

    clearResults(): void {
        this.results = [];
        this.showResults = false;
    }

    get successCount(): number {
        return this.results.filter(r => r.status === 'success').length;
    }

    get errorCount(): number {
        return this.results.filter(r => r.status === 'error').length;
    }
}
