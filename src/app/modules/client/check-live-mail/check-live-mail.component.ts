import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { MicrosoftGraphService, CheckLiveResult } from '../../../core/services/microsoft-graph.service';
import { CheckStatus } from '../../../core/models/hotmail.model';

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
    imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslateModule],
    templateUrl: './check-live-mail.component.html',
    styleUrls: ['./check-live-mail.component.scss']
})
export class CheckLiveMailComponent implements OnInit, OnDestroy {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly seoService = inject(SeoService);
    private readonly translate = inject(TranslateService);
    private readonly graphService = inject(MicrosoftGraphService);

    checkForm!: FormGroup;
    isLoading = false;
    showResults = false;
    removeDuplicate = true;
    isStopped = false;

    liveResults: MailCheckResult[] = [];
    dieResults: MailCheckResult[] = [];
    unknownResults: MailCheckResult[] = [];
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
            'Kiểm Tra Live Mail - EmailSieuRe',
            'Công cụ kiểm tra trạng thái hoạt động của email Hotmail/Outlook nhanh chóng và chính xác.',
            'check live mail, kiểm tra email, Hotmail, Outlook, EmailSieuRe'
        );
        this.checkForm = this.formBuilder.group({
            emailData: ['', [Validators.required, Validators.minLength(10)]]
        });
    }

    ngOnDestroy(): void {
        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
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

    async onCheck(): Promise<void> {
        if (this.checkForm.invalid) {
            this.notificationService.warning(this.translate.instant('MESSAGE.NO_EMAIL_INPUT'));
            return;
        }

        // Reset state
        this.liveResults = [];
        this.dieResults = [];
        this.unknownResults = [];
        this.processedCount = 0;
        this.isLoading = true;
        this.showResults = true;
        this.isStopped = false;

        let emailData = this.checkForm.get('emailData')?.value.trim();
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
            this.translate.instant('MESSAGE.CHECK_COMPLETED', {
                live: this.liveCount,
                die: this.dieCount,
                unknown: this.unknownCount
            })
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
                isLive: false,
                error: 'Invalid format: requires email|password|refresh_token|client_id',
                status: 'FAILED'
            });
            return;
        }

        const email = parts[0].trim();
        const password = parts[1].trim();
        const refreshToken = parts[2].trim();
        const clientId = parts.length > 3 && parts[3].trim() ? parts[3].trim() : this.DEFAULT_CLIENT_ID;

        try {
            const result = await this.graphService.checkLive(
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
                isLive: false,
                error: error.message,
                status: 'UNKNOWN'
            });
        }
    }

    private handleResult(result: CheckLiveResult): void {
        this.processedCount++;
        const mailResult: MailCheckResult = {
            email: result.email,
            password: result.password || '',
            refreshToken: result.refreshToken,
            clientId: result.clientId,
            status: result.status,
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
        if (!data) { this.notificationService.warning(this.translate.instant('MESSAGE.NO_EMAIL_LIVE')); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('live');
            this.notificationService.success(this.translate.instant('MESSAGE.COPIED_LIVE', { count: this.liveCount }));
        });
    }

    copyDie(): void {
        const data = this.dieResults.map(r => `${r.email}|${r.password}`).join('\n');
        if (!data) { this.notificationService.warning(this.translate.instant('MESSAGE.NO_EMAIL_DIE')); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('die');
            this.notificationService.success(this.translate.instant('MESSAGE.COPIED_DIE', { count: this.dieCount }));
        });
    }

    copyUnknown(): void {
        const data = this.unknownResults.map(r => `${r.email}|${r.password}`).join('\n');
        if (!data) { this.notificationService.warning(this.translate.instant('MESSAGE.NO_EMAIL_UNKNOWN')); return; }
        navigator.clipboard.writeText(data).then(() => {
            this.setCopied('unknown');
            this.notificationService.success(this.translate.instant('MESSAGE.COPIED_UNKNOWN', { count: this.unknownCount }));
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
        this.isStopped = true;
        this.isLoading = false;
        this.notificationService.info(this.translate.instant('MESSAGE.CHECK_STOPPED'));
    }
}
