import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { HotmailApi } from '../../../Utils/apis/hotmail/hotmail.api';

interface EmailMessage {
    subject: string;
    from: string;
    preview: string;
    htmlBody: string;
    date: string;
    isRead: boolean;
    hasAttachments: boolean;
}

interface ReadMailResult {
    email: string;
    password?: string;
    success: boolean;
    status: 'SUCCESS' | 'FAILED' | 'UNKNOWN';
    messages?: EmailMessage[];
    totalMessages?: number;
    error?: string;
    expanded?: boolean;
}

@Component({
    selector: 'app-read-mail',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TranslateModule],
    templateUrl: './read-mail.component.html',
    styleUrls: ['./read-mail.component.scss']
})
export class ReadMailComponent implements OnInit, OnDestroy {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly seoService = inject(SeoService);

    readMailForm!: FormGroup;
    isLoading = false;
    showResults = false;

    private eventSource: EventSource | null = null;

    results: ReadMailResult[] = [];
    totalCount = 0;
    processedCount = 0;

    // Modal state
    showEmailModal = false;
    selectedMessage: EmailMessage | null = null;
    selectedAccountEmail = '';

    ngOnInit(): void {
        this.seoService.setPageMeta(
            'Đọc Mail - EmailSieuRe',
            'Công cụ đọc email từ hộp thư Hotmail/Outlook. Xem nội dung thư đến nhanh chóng.',
            'đọc mail, read mail, Hotmail, Outlook, inbox, EmailSieuRe'
        );
        this.readMailForm = this.formBuilder.group({
            emailData: ['', [Validators.required, Validators.minLength(10)]],
            messageCount: [20, [Validators.min(5), Validators.max(50)]]
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

    get emailCount(): number {
        const data = this.readMailForm.get('emailData')?.value || '';
        return data.trim().split('\n').filter((line: string) => line.trim().length > 0).length;
    }

    get successCount(): number {
        return this.results.filter(r => r.status === 'SUCCESS').length;
    }

    get failedCount(): number {
        return this.results.filter(r => r.status === 'FAILED' || r.status === 'UNKNOWN').length;
    }

    get progressPercent(): number {
        return this.totalCount > 0 ? Math.round((this.processedCount / this.totalCount) * 100) : 0;
    }

    onReadMail(): void {
        if (this.readMailForm.invalid) {
            this.notificationService.warning('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        this.results = [];
        this.processedCount = 0;
        this.isLoading = true;
        this.showResults = true;
        this.closeEventSource();

        const emailData = this.readMailForm.get('emailData')?.value.trim();
        const messageCount = this.readMailForm.get('messageCount')?.value || 20;
        this.totalCount = emailData.split('\n').filter((line: string) => line.trim().length > 0).length;

        const request = {
            emailData,
            messageCount
        };

        fetch(HotmailApi.READ_MAIL_START, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
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
        const url = `${HotmailApi.READ_MAIL_STREAM}?sessionId=${sessionId}`;
        this.eventSource = new EventSource(url);

        this.eventSource.onmessage = (event) => {
            try {
                const result = JSON.parse(event.data);
                this.handleResult(result);
            } catch (e) { }
        };

        this.eventSource.addEventListener('result', (event: any) => {
            try {
                const result = JSON.parse(event.data);
                this.handleResult(result);
            } catch (e) { }
        });

        this.eventSource.addEventListener('done', () => {
            this.closeEventSource();
            this.isLoading = false;
            this.notificationService.success(
                `Hoàn thành: ${this.successCount} thành công, ${this.failedCount} thất bại`
            );
        });

        this.eventSource.onerror = () => {
            this.closeEventSource();
            this.isLoading = false;
        };
    }

    private handleResult(result: any): void {
        this.processedCount++;
        const mailResult: ReadMailResult = {
            email: result.email,
            password: result.password,
            success: result.success,
            status: result.status || (result.success ? 'SUCCESS' : 'FAILED'),
            messages: result.messages || [],
            totalMessages: result.totalMessages || 0,
            error: result.error,
            expanded: false
        };
        this.results = [...this.results, mailResult];
    }

    toggleExpand(result: ReadMailResult): void {
        result.expanded = !result.expanded;
    }

    // Modal methods
    openEmailModal(msg: EmailMessage, accountEmail: string): void {
        this.selectedMessage = msg;
        this.selectedAccountEmail = accountEmail;
        this.showEmailModal = true;
        document.body.style.overflow = 'hidden';
    }

    closeEmailModal(): void {
        this.showEmailModal = false;
        this.selectedMessage = null;
        this.selectedAccountEmail = '';
        document.body.style.overflow = '';
    }

    copyToClipboard(text: string, label: string): void {
        navigator.clipboard.writeText(text).then(() =>
            this.notificationService.success(`Đã copy ${label}!`)
        );
    }

    copyEmail(email: string): void {
        navigator.clipboard.writeText(email).then(() =>
            this.notificationService.success('Đã copy email!')
        );
    }

    copySubject(subject: string): void {
        navigator.clipboard.writeText(subject).then(() =>
            this.notificationService.success('Đã copy tiêu đề!')
        );
    }

    clearResults(): void {
        this.results = [];
        this.processedCount = 0;
        this.totalCount = 0;
        this.showResults = false;
    }

    stopReadMail(): void {
        this.closeEventSource();
        this.isLoading = false;
        this.notificationService.info('Đã dừng đọc mail');
    }
}

