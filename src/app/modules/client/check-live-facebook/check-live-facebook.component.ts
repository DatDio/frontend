import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { NotificationService } from '../../../core/services/notification.service';

interface FacebookCheckResult {
    uid: string;
    status: 'live' | 'die' | 'checking';
    name?: string;
    avatar?: string;
    error?: string;
}

@Component({
    selector: 'app-check-live-facebook',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './check-live-facebook.component.html',
    styleUrls: ['./check-live-facebook.component.scss']
})
export class CheckLiveFacebookComponent implements OnInit {
    private readonly formBuilder = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);

    checkForm!: FormGroup;
    isLoading = false;
    results: FacebookCheckResult[] = [];
    showResults = false;

    ngOnInit(): void {
        this.initForm();
    }

    private initForm(): void {
        this.checkForm = this.formBuilder.group({
            uidData: ['', [Validators.required, Validators.minLength(5)]]
        });
    }

    get uidCount(): number {
        const data = this.checkForm.get('uidData')?.value || '';
        return data.trim().split('\n').filter((line: string) => line.trim().length > 0).length;
    }

    onCheck(): void {
        if (this.checkForm.invalid) {
            this.notificationService.warning('Vui lòng nhập danh sách UID');
            return;
        }

        this.isLoading = true;
        this.showResults = true;
        const uidData = this.checkForm.get('uidData')?.value.trim();
        const uids = uidData.split('\n').filter((line: string) => line.trim().length > 0);

        // Initialize results with checking status
        this.results = uids.map((uid: string) => ({
            uid: uid.trim(),
            status: 'checking' as const
        }));

        // Check each UID using Facebook Graph API
        this.results.forEach((result, index) => {
            this.checkFacebookUid(result.uid, index);
        });
    }

    private checkFacebookUid(uid: string, index: number): void {
        // Use Facebook Graph API to check if UID exists
        const img = new Image();
        img.onload = () => {
            this.results[index] = {
                ...this.results[index],
                status: 'live',
                avatar: `https://graph.facebook.com/${uid}/picture?type=large`
            };
            this.checkIfComplete();
        };
        img.onerror = () => {
            this.results[index] = {
                ...this.results[index],
                status: 'die',
                error: 'UID không tồn tại hoặc đã bị khóa'
            };
            this.checkIfComplete();
        };
        img.src = `https://graph.facebook.com/${uid}/picture?type=large`;
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
        const liveUids = this.results.filter(r => r.status === 'live').map(r => r.uid).join('\n');
        if (!liveUids) {
            this.notificationService.warning('Không có UID live nào');
            return;
        }
        navigator.clipboard.writeText(liveUids).then(() => {
            this.notificationService.success('Đã copy tất cả UID live!');
        });
    }

    copyAllDie(): void {
        const dieUids = this.results.filter(r => r.status === 'die').map(r => r.uid).join('\n');
        if (!dieUids) {
            this.notificationService.warning('Không có UID die nào');
            return;
        }
        navigator.clipboard.writeText(dieUids).then(() => {
            this.notificationService.success('Đã copy tất cả UID die!');
        });
    }

    clearResults(): void {
        this.results = [];
        this.showResults = false;
    }

    get liveCount(): number {
        return this.results.filter(r => r.status === 'live').length;
    }

    get dieCount(): number {
        return this.results.filter(r => r.status === 'die').length;
    }
}
