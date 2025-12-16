import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { CheckLiveMailResponse, CheckStatus } from '../../../core/models/hotmail.model';
import { HotmailApi } from '../../../Utils/apis/hotmail/hotmail.api';

interface MailCheckResult {
    email: string;
    password: string;
    refreshToken?: string;
    clientId?: string;
    status: CheckStatus;
    error?: string;
}

@Component({
    selector: 'app-check-live-mail',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './check-live-mail.component.html',
    styleUrls: ['./check-live-mail.component.scss']
})
export class CheckLiveMailComponent implements OnInit, OnDestroy {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly seoService = inject(SeoService);

    checkForm!: FormGroup;
    isLoading = false;
    showResults = false;
    removeDuplicate = true;

    private eventSource: EventSource | null = null;

    liveResults: MailCheckResult[] = [];
    dieResults: MailCheckResult[] = [];
    unknownResults: MailCheckResult[] = [];
    totalCount = 0;
    processedCount = 0;

    // Copy state tracking
    copiedType: string | null = null;
    private copyTimeout: any;

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Kiểm Tra Live Mail - MailShop',
            'Công cụ kiểm tra trạng thái hoạt động của email Hotmail/Outlook nhanh chóng và chính xác.',
            'check live mail, kiểm tra email, Hotmail, Outlook, MailShop'
        );
        this.checkForm = this.formBuilder.group({
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
        const data = this.checkForm.get('emailData')?.value || '';
        return data.trim().split('\n').filter((line: string) => line.trim().length > 0).length;
    }

    get liveCount(): number { return this.liveResults.length; }
    get dieCount(): number { return this.dieResults.length; }
    get unknownCount(): number { return this.unknownResults.length; }
    get progressPercent(): number {
        return this.totalCount > 0 ? Math.round((this.processedCount / this.totalCount) * 100) : 0;
    }

    onCheck(): void {
        if (this.checkForm.invalid) {
            this.notificationService.warning('Vui lòng nhập danh sách email');
            return;
        }

        this.liveResults = [];
        this.dieResults = [];
        this.unknownResults = [];
        this.processedCount = 0;
        this.isLoading = true;
        this.showResults = true;
        this.closeEventSource();

        let emailData = this.checkForm.get('emailData')?.value.trim();
        if (this.removeDuplicate) {
            const lines = emailData.split('\n').filter((line: string) => line.trim().length > 0);
            emailData = [...new Set(lines)].join('\n');
        }
        this.totalCount = emailData.split('\n').filter((line: string) => line.trim().length > 0).length;

        fetch(HotmailApi.CHECK_LIVE_MAIL_START, {
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
        const url = `${HotmailApi.CHECK_LIVE_MAIL_STREAM}?sessionId=${sessionId}`;
        this.eventSource = new EventSource(url);

        this.eventSource.onmessage = (event) => {
            try {
                const result: CheckLiveMailResponse = JSON.parse(event.data);
                this.handleResult(result);
            } catch (e) { }
        };

        this.eventSource.addEventListener('result', (event: any) => {
            try {
                const result: CheckLiveMailResponse = JSON.parse(event.data);
                this.handleResult(result);
            } catch (e) { }
        });

        this.eventSource.addEventListener('done', () => {
            this.closeEventSource();
            this.isLoading = false;
            this.notificationService.success(
                `Hoàn thành: ${this.liveCount} live, ${this.dieCount} die, ${this.unknownCount} unknown`
            );
        });

        this.eventSource.onerror = () => {
            this.closeEventSource();
            this.isLoading = false;
        };
    }

    private handleResult(result: CheckLiveMailResponse): void {
        this.processedCount++;
        const mailResult: MailCheckResult = {
            email: result.email,
            password: result.password || '',
            refreshToken: result.refreshToken,
            clientId: result.clientId,
            status: result.status || (result.isLive ? 'SUCCESS' : 'FAILED'),
            error: result.error
        };

        if (mailResult.status === 'SUCCESS') {
            this.liveResults = [...this.liveResults, mailResult];
        } else if (mailResult.status === 'FAILED') {
            this.dieResults = [...this.dieResults, mailResult];
        } else {
            this.unknownResults = [...this.unknownResults, mailResult];
        }
    }

    copyLive(): void {
        const data = this.liveResults.map(r => `${r.email}|${r.password}${r.refreshToken ? '|' + r.refreshToken : ''}${r.clientId ? '|' + r.clientId : ''}`).join('\n');
        if (!data) { this.notificationService.warning('Không có email live'); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('live');
            this.notificationService.success(`Đã copy ${this.liveCount} email live!`);
        });
    }

    copyDie(): void {
        const data = this.dieResults.map(r => `${r.email}|${r.password}`).join('\n');
        if (!data) { this.notificationService.warning('Không có email die'); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('die');
            this.notificationService.success(`Đã copy ${this.dieCount} email die!`);
        });
    }

    copyUnknown(): void {
        const data = this.unknownResults.map(r => `${r.email}|${r.password}`).join('\n');
        if (!data) { this.notificationService.warning('Không có email unknown'); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('unknown');
            this.notificationService.success(`Đã copy ${this.unknownCount} email unknown!`);
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
        this.liveResults = [];
        this.dieResults = [];
        this.unknownResults = [];
        this.processedCount = 0;
        this.totalCount = 0;
        this.showResults = false;
    }

    stopCheck(): void {
        this.closeEventSource();
        this.isLoading = false;
        this.notificationService.info('Đã dừng kiểm tra');
    }
}
