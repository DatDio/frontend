import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';

import { NotificationService } from '../../../core/services/notification.service';
import { HotmailService } from '../../../core/services/hotmail.service';
import { finalize } from 'rxjs/operators';

interface MailCheckResult {
    email: string;
    password: string;
    refreshToken?: string;
    clientId?: string;
    status: 'live' | 'die' | 'checking';
    error?: string;
}

@Component({
    selector: 'app-check-live-mail',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './check-live-mail.component.html',
    styleUrls: ['./check-live-mail.component.scss']
})
export class CheckLiveMailComponent implements OnInit {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);
    private readonly hotmailService = inject(HotmailService);

    checkForm!: FormGroup;
    isLoading = false;
    results: MailCheckResult[] = [];
    showResults = false;
    removeDuplicate = true;

    ngOnInit(): void {
        this.initForm();
    }

    private initForm(): void {
        this.checkForm = this.formBuilder.group({
            emailData: ['', [Validators.required, Validators.minLength(10)]]
        });
    }

    get emailCount(): number {
        const data = this.checkForm.get('emailData')?.value || '';
        return data.trim().split('\n').filter((line: string) => line.trim().length > 0).length;
    }

    onCheck(): void {
        if (this.checkForm.invalid) {
            this.notificationService.warning('Vui lòng nhập danh sách email');
            return;
        }

        this.isLoading = true;
        this.showResults = true;
        let emailData = this.checkForm.get('emailData')?.value.trim();

        // Remove duplicates if enabled
        if (this.removeDuplicate) {
            const lines = emailData.split('\n').filter((line: string) => line.trim().length > 0);
            emailData = [...new Set(lines)].join('\n');
        }

        // Initialize results with checking status
        const lines = emailData.split('\n').filter((line: string) => line.trim().length > 0);
        this.results = lines.map((line: string) => {
            const parts = line.split('|');
            return {
                email: parts[0]?.trim() || '',
                password: parts[1]?.trim() || '',
                refreshToken: parts[2]?.trim() || '',
                clientId: parts[3]?.trim() || '',
                status: 'checking' as const
            };
        });

        // Call backend API to check mail live status
        const request = { emailData };
        this.hotmailService.checkLiveMail(request)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.results = response.data.map(r => ({
                            email: r.email,
                            password: r.password || '',
                            refreshToken: r.refreshToken || '',
                            clientId: r.clientId || '',
                            status: r.isLive ? 'live' as const : 'die' as const,
                            error: r.error
                        }));
                        const liveCount = this.results.filter(r => r.status === 'live').length;
                        this.notificationService.success(`Hoàn thành: ${liveCount}/${this.results.length} live`);
                    } else {
                        this.notificationService.error(response.message || 'Không thể kiểm tra email');
                    }
                },
                error: (error) => {
                    this.notificationService.error(error.error?.message || 'Đã xảy ra lỗi khi kiểm tra');
                }
            });
    }

    private checkIfComplete(): void {
        const allDone = this.results.every(r => r.status !== 'checking');
        if (allDone) {
            this.isLoading = false;
            const liveCount = this.results.filter(r => r.status === 'live').length;
            this.notificationService.success(`Hoàn thành: ${liveCount}/${this.results.length} live`);
        }
    }

    copyAllLive(): void {
        const liveEmails = this.results
            .filter(r => r.status === 'live')
            .map(r => `${r.email}|${r.password}${r.refreshToken ? '|' + r.refreshToken : ''}${r.clientId ? '|' + r.clientId : ''}`)
            .join('\n');
        if (!liveEmails) {
            this.notificationService.warning('Không có email live nào');
            return;
        }
        navigator.clipboard.writeText(liveEmails).then(() => {
            this.notificationService.success('Đã copy tất cả email live!');
        });
    }

    copyAllDie(): void {
        const dieEmails = this.results
            .filter(r => r.status === 'die')
            .map(r => `${r.email}|${r.password}`)
            .join('\n');
        if (!dieEmails) {
            this.notificationService.warning('Không có email die nào');
            return;
        }
        navigator.clipboard.writeText(dieEmails).then(() => {
            this.notificationService.success('Đã copy tất cả email die!');
        });
    }

    clearResults(): void {
        this.results = [];
        this.showResults = false;
    }

    filter(): void {
        // Filter out die emails from textarea
        const liveEmails = this.results
            .filter(r => r.status === 'live')
            .map(r => `${r.email}|${r.password}${r.refreshToken ? '|' + r.refreshToken : ''}${r.clientId ? '|' + r.clientId : ''}`)
            .join('\n');
        this.checkForm.patchValue({ emailData: liveEmails });
        this.notificationService.success('Đã lọc, chỉ giữ lại email live');
    }

    get liveCount(): number {
        return this.results.filter(r => r.status === 'live').length;
    }

    get dieCount(): number {
        return this.results.filter(r => r.status === 'die').length;
    }
}
