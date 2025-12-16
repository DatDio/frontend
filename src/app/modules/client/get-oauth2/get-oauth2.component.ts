import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { GetOAuth2Response, CheckStatus } from '../../../core/models/hotmail.model';
import { HotmailApi } from '../../../Utils/apis/hotmail/hotmail.api';

interface OAuth2Result {
    email: string;
    password: string;
    refreshToken: string;  // New refresh token after renewal
    clientId: string;
    accessToken?: string;
    fullData?: string;
    status: CheckStatus;
    error?: string;
}

@Component({
    selector: 'app-get-oauth2',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './get-oauth2.component.html',
    styleUrls: ['./get-oauth2.component.scss']
})
export class GetOAuth2Component implements OnInit, OnDestroy {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly seoService = inject(SeoService);

    getForm!: FormGroup;
    isLoading = false;
    showResults = false;
    removeDuplicate = true;

    private eventSource: EventSource | null = null;

    successResults: OAuth2Result[] = [];
    errorResults: OAuth2Result[] = [];
    unknownResults: OAuth2Result[] = [];
    totalCount = 0;
    processedCount = 0;

    // Copy state tracking
    copiedType: string | null = null;
    private copyTimeout: any;

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Lấy OAuth2 Token - MailShop',
            'Công cụ lấy Refresh Token mới cho email Hotmail/Outlook.',
            'get OAuth2, refresh token, Hotmail, Outlook, MailShop'
        );
        this.getForm = this.formBuilder.group({
            emailData: ['', [Validators.required, Validators.minLength(10)]]
        });
    }

    ngOnDestroy(): void {
        this.closeEventSource();
        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }
    }

    private closeEventSource(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
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

    onGet(): void {
        if (this.getForm.invalid) {
            this.notificationService.warning('Vui lòng nhập danh sách email');
            return;
        }

        this.successResults = [];
        this.errorResults = [];
        this.unknownResults = [];
        this.processedCount = 0;
        this.isLoading = true;
        this.showResults = true;
        this.closeEventSource();

        let emailData = this.getForm.get('emailData')?.value.trim();
        if (this.removeDuplicate) {
            const lines = emailData.split('\n').filter((line: string) => line.trim().length > 0);
            emailData = [...new Set(lines)].join('\n');
        }
        this.totalCount = emailData.split('\n').filter((line: string) => line.trim().length > 0).length;

        fetch(HotmailApi.GET_OAUTH2_START, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailData })
        })
            .then(res => res.json())
            .then(result => {
                if (result.success && result.data?.sessionId) {
                    this.connectToStream(result.data.sessionId);
                } else {
                    throw new Error(result.message || 'Failed to create session');
                }
            })
            .catch(error => {
                this.isLoading = false;
                this.notificationService.error('Lỗi: ' + error.message);
            });
    }

    private connectToStream(sessionId: string): void {
        const url = `${HotmailApi.GET_OAUTH2_STREAM}?sessionId=${sessionId}`;
        this.eventSource = new EventSource(url);

        this.eventSource.onmessage = (event) => {
            try {
                const result: GetOAuth2Response = JSON.parse(event.data);
                this.handleResult(result);
            } catch (e) { }
        };

        this.eventSource.addEventListener('result', (event: any) => {
            try {
                const result: GetOAuth2Response = JSON.parse(event.data);
                this.handleResult(result);
            } catch (e) { }
        });

        this.eventSource.addEventListener('done', () => {
            this.closeEventSource();
            this.isLoading = false;
            this.notificationService.success(
                `Hoàn thành: ${this.successCount} thành công, ${this.errorCount} thất bại, ${this.unknownCount} unknown`
            );
        });

        this.eventSource.onerror = () => {
            this.closeEventSource();
            this.isLoading = false;
        };
    }

    private handleResult(result: GetOAuth2Response): void {
        this.processedCount++;
        const oauth2Result: OAuth2Result = {
            email: result.email,
            password: result.password || '',
            refreshToken: result.refreshToken || '',
            clientId: result.clientId || '',
            accessToken: result.accessToken,
            fullData: result.fullData || '',
            status: result.status || (result.success ? 'SUCCESS' : 'FAILED'),
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
        this.closeEventSource();
        this.isLoading = false;
        this.notificationService.info('Đã dừng lấy token');
    }
}
