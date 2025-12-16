import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { FacebookApi } from '../../../Utils/apis/facebook/facebook.api';
import { CheckStatus } from '../../../core/models/hotmail.model';

interface FacebookCheckResult {
    uid: string;
    status: CheckStatus;
    avatar?: string;
    error?: string;
}

@Component({
    selector: 'app-check-live-facebook',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './check-live-facebook.component.html',
    styleUrls: ['./check-live-facebook.component.scss']
})
export class CheckLiveFacebookComponent implements OnInit, OnDestroy {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly seoService = inject(SeoService);

    checkForm!: FormGroup;
    isLoading = false;
    showResults = false;
    removeDuplicate = true;

    private eventSource: EventSource | null = null;

    liveResults: FacebookCheckResult[] = [];
    dieResults: FacebookCheckResult[] = [];
    unknownResults: FacebookCheckResult[] = [];
    totalCount = 0;
    processedCount = 0;

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Kiểm Tra Live Facebook - MailShop',
            'Công cụ kiểm tra trạng thái hoạt động của tài khoản Facebook theo UID nhanh chóng và chính xác.',
            'check live facebook, kiểm tra facebook, facebook UID, MailShop'
        );
        this.checkForm = this.formBuilder.group({
            uidData: ['', [Validators.required, Validators.minLength(5)]]
        });
    }

    ngOnDestroy(): void {
        this.closeEventSource();
    }

    private closeEventSource(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    get uidCount(): number {
        const data = this.checkForm.get('uidData')?.value || '';
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
            this.notificationService.warning('Vui lòng nhập danh sách UID');
            return;
        }

        this.liveResults = [];
        this.dieResults = [];
        this.unknownResults = [];
        this.processedCount = 0;
        this.isLoading = true;
        this.showResults = true;
        this.closeEventSource();

        let uidData = this.checkForm.get('uidData')?.value.trim();
        if (this.removeDuplicate) {
            const lines = uidData.split('\n').filter((line: string) => line.trim().length > 0);
            uidData = [...new Set(lines)].join('\n');
        }
        this.totalCount = uidData.split('\n').filter((line: string) => line.trim().length > 0).length;

        fetch(FacebookApi.CHECK_LIVE_START, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uidData })
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
        const url = `${FacebookApi.CHECK_LIVE_STREAM}?sessionId=${sessionId}`;
        this.eventSource = new EventSource(url);

        this.eventSource.onmessage = (event) => {
            try {
                const result: FacebookCheckResult = JSON.parse(event.data);
                this.handleResult(result);
            } catch (e) { }
        };

        this.eventSource.addEventListener('result', (event: any) => {
            try {
                const result: FacebookCheckResult = JSON.parse(event.data);
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

    private handleResult(result: FacebookCheckResult): void {
        this.processedCount++;

        if (result.status === 'SUCCESS') {
            this.liveResults = [...this.liveResults, result];
        } else if (result.status === 'FAILED') {
            this.dieResults = [...this.dieResults, result];
        } else {
            this.unknownResults = [...this.unknownResults, result];
        }
    }

    copyAllLive(): void {
        const liveUids = this.liveResults.map(r => r.uid).join('\n');
        if (!liveUids) {
            this.notificationService.warning('Không có UID live nào');
            return;
        }
        navigator.clipboard.writeText(liveUids).then(() => {
            this.notificationService.success(`Đã copy ${this.liveCount} UID live!`);
        });
    }

    copyAllDie(): void {
        const dieUids = this.dieResults.map(r => r.uid).join('\n');
        if (!dieUids) {
            this.notificationService.warning('Không có UID die nào');
            return;
        }
        navigator.clipboard.writeText(dieUids).then(() => {
            this.notificationService.success(`Đã copy ${this.dieCount} UID die!`);
        });
    }

    copyAllUnknown(): void {
        const unknownUids = this.unknownResults.map(r => r.uid).join('\n');
        if (!unknownUids) {
            this.notificationService.warning('Không có UID unknown nào');
            return;
        }
        navigator.clipboard.writeText(unknownUids).then(() => {
            this.notificationService.success(`Đã copy ${this.unknownCount} UID unknown!`);
        });
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
