import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { MicrosoftGraphService, OAuth2Result } from '../../../core/services/microsoft-graph.service';
import { CheckStatus } from '../../../core/models/hotmail.model';

interface OAuth2ResultItem {
    email: string;
    password: string;
    refreshToken: string;
    clientId: string;
    accessToken?: string;
    fullData?: string;
    status: CheckStatus;
    error?: string;
}

@Component({
    selector: 'app-get-oauth2',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslateModule],
    templateUrl: './get-oauth2.component.html',
    styleUrls: ['./get-oauth2.component.scss']
})
export class GetOAuth2Component implements OnInit, OnDestroy {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly seoService = inject(SeoService);
    private readonly graphService = inject(MicrosoftGraphService);

    getForm!: FormGroup;
    isLoading = false;
    showResults = false;
    removeDuplicate = true;
    isStopped = false;

    successResults: OAuth2ResultItem[] = [];
    errorResults: OAuth2ResultItem[] = [];
    unknownResults: OAuth2ResultItem[] = [];
    totalCount = 0;
    processedCount = 0;

    // Copy state tracking
    copiedType: string | null = null;
    private copyTimeout: any;

    // Concurrency control
    private readonly MAX_CONCURRENT = 10;
    private readonly DEFAULT_CLIENT_ID = '9e5f94bc-e8a4-4e73-b8be-63364c29d753';

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Lấy OAuth2 Token - EmailSieuRe',
            'Công cụ lấy Refresh Token mới cho email Hotmail/Outlook.',
            'get OAuth2, refresh token, Hotmail, Outlook, EmailSieuRe'
        );
        this.getForm = this.formBuilder.group({
            emailData: ['', [Validators.required, Validators.minLength(10)]]
        });
    }

    ngOnDestroy(): void {
        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }
    }

    get emailCount(): number {
        const data = this.getForm.get('emailData')?.value || '';
        return data.trim().split('\n').filter((line: string) => line.trim().length > 0).length;
    }

    get successCount(): number { return this.successResults.length; }
    get errorCount(): number { return this.errorResults.length; }
    get unknownCount(): number { return this.unknownResults.length; }
    get progressPercent(): number {
        return this.totalCount > 0 ? Math.round((this.processedCount / this.totalCount) * 100) : 0;
    }

    async onGet(): Promise<void> {
        if (this.getForm.invalid) {
            this.notificationService.warning('Vui lòng nhập danh sách email');
            return;
        }

        // Reset state
        this.successResults = [];
        this.errorResults = [];
        this.unknownResults = [];
        this.processedCount = 0;
        this.isLoading = true;
        this.showResults = true;
        this.isStopped = false;

        let emailData = this.getForm.get('emailData')?.value.trim();
        if (this.removeDuplicate) {
            const lines = emailData.split('\n').filter((line: string) => line.trim().length > 0);
            emailData = [...new Set(lines)].join('\n');
        }

        const emailLines = emailData.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);

        this.totalCount = emailLines.length;

        // Process emails with concurrency control
        await this.processEmailsConcurrently(emailLines);

        this.isLoading = false;
        this.notificationService.success(
            `Hoàn thành: ${this.successCount} thành công, ${this.errorCount} thất bại, ${this.unknownCount} unknown`
        );
    }

    private async processEmailsConcurrently(emailLines: string[]): Promise<void> {
        const queue = [...emailLines];
        let activeCount = 0;
        const maxConcurrent = this.MAX_CONCURRENT;

        const processNext = async (): Promise<void> => {
            while (queue.length > 0 && !this.isStopped) {
                if (activeCount >= maxConcurrent) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }

                const line = queue.shift();
                if (!line) break;

                activeCount++;
                this.processSingleEmail(line).finally(() => {
                    activeCount--;
                });
            }
        };

        const workers = [];
        for (let i = 0; i < maxConcurrent; i++) {
            workers.push(processNext());
        }

        await Promise.all(workers);

        while (activeCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    private async processSingleEmail(line: string): Promise<void> {
        const parts = line.split('|');

        if (parts.length < 3) {
            this.handleResult({
                email: parts[0] || line,
                password: parts[1] || '',
                refreshToken: '',
                clientId: '',
                status: 'FAILED',
                error: 'Invalid format: requires email|password|refresh_token|client_id'
            });
            return;
        }

        const email = parts[0].trim();
        const password = parts[1].trim();
        const refreshToken = parts[2].trim();
        const clientId = parts.length > 3 && parts[3].trim() ? parts[3].trim() : this.DEFAULT_CLIENT_ID;

        try {
            const result = await this.graphService.getOAuth2(
                email, password, refreshToken, clientId
            ).toPromise();

            if (result) {
                this.handleResult(result);
            }
        } catch (error: any) {
            this.handleResult({
                email,
                password,
                refreshToken,
                clientId,
                status: 'UNKNOWN',
                error: error.message
            });
        }
    }

    private handleResult(result: OAuth2Result): void {
        this.processedCount++;
        const oauth2Result: OAuth2ResultItem = {
            email: result.email,
            password: result.password || '',
            refreshToken: result.refreshToken || '',
            clientId: result.clientId || '',
            accessToken: result.accessToken,
            fullData: result.fullData || '',
            status: result.status,
            error: result.error
        };

        if (oauth2Result.status === 'SUCCESS') {
            this.successResults = [...this.successResults, oauth2Result];
        } else if (oauth2Result.status === 'FAILED') {
            this.errorResults = [...this.errorResults, oauth2Result];
        } else {
            this.unknownResults = [...this.unknownResults, oauth2Result];
        }
    }

    copyToken(token: string): void {
        navigator.clipboard.writeText(token).then(() => {
            this.setCopied('token');
            this.notificationService.success('Đã copy access token!');
        });
    }

    copyFullData(fullData: string): void {
        if (!fullData) { this.notificationService.warning('Không có dữ liệu'); return; }
        navigator.clipboard.writeText(fullData).then(() => {
            this.notificationService.success('Đã copy dữ liệu!');
        });
    }

    copySuccess(): void {
        const data = this.successResults.map(r => r.fullData || `${r.email}|${r.password}|${r.refreshToken}|${r.clientId}`).join('\n');
        if (!data) { this.notificationService.warning('Không có dữ liệu'); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('success');
            this.notificationService.success(`Đã copy ${this.successCount} email với new refresh token!`);
        });
    }

    copyError(): void {
        const data = this.errorResults.map(r => `${r.email}|${r.password}|${r.refreshToken}|${r.clientId}`).join('\n');
        if (!data) { this.notificationService.warning('Không có email lỗi'); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('error');
            this.notificationService.success(`Đã copy ${this.errorCount} email lỗi!`);
        });
    }

    copyUnknown(): void {
        const data = this.unknownResults.map(r => `${r.email}|${r.password}`).join('\n');
        if (!data) { this.notificationService.warning('Không có email unknown'); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('unknown');
            this.notificationService.success(`Đã copy ${this.unknownCount} email!`);
        });
    }

    private setCopied(type: string): void {
        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }
        this.copiedType = type;
        this.copyTimeout = setTimeout(() => {
            this.copiedType = null;
        }, 2000);
    }

    clearResults(): void {
        this.successResults = [];
        this.errorResults = [];
        this.unknownResults = [];
        this.processedCount = 0;
        this.totalCount = 0;
        this.showResults = false;
    }

    stopGet(): void {
        this.isStopped = true;
        this.isLoading = false;
        this.notificationService.info('Đã dừng lấy token');
    }
}
