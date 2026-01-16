import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RegService } from '../../../core/services/reg.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RegRequest, RegRequestCreate, RegRequestType, RegResult, RegResultStatus } from '../../../core/models/reg-request.model';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';

@Component({
    selector: 'app-reg-tool',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
    templateUrl: './reg-tool.component.html',
    styleUrl: './reg-tool.component.scss'
})
export class RegToolComponent implements OnInit, OnDestroy {
    private readonly regService = inject(RegService);
    private readonly notificationService = inject(NotificationService);
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly wsService = inject(WebSocketService);

    form!: FormGroup;
    isSubmitting = false;

    // Current request tracking
    currentRequest: RegRequest | null = null;
    results: RegResult[] = [];

    // Request history
    myRequests: RegRequest[] = [];

    // WebSocket unsubscribe function
    private wsUnsubscribe: (() => void) | null = null;

    ngOnInit(): void {
        this.initForm();
        this.loadMyRequests();
    }

    ngOnDestroy(): void {
        this.unsubscribeWebSocket();
    }

    private initForm(): void {
        this.form = this.fb.group({
            requestType: ['USER_ONLY', Validators.required],
            inputData: ['', [Validators.required, Validators.minLength(1)]]
        });
    }

    get inputLines(): string[] {
        const raw = this.form.get('inputData')?.value || '';
        return raw.split('\n').filter((line: string) => line.trim() !== '');
    }

    get estimatedTotal(): number {
        const pricePerAccount = 500; // TODO: get from settings
        return this.inputLines.length * pricePerAccount;
    }

    onSubmit(): void {
        if (this.form.invalid || this.inputLines.length === 0) {
            this.notificationService.error('Vui lòng nhập danh sách username');
            return;
        }

        this.isSubmitting = true;

        const request: RegRequestCreate = {
            requestType: this.form.get('requestType')?.value as RegRequestType,
            inputList: this.inputLines
        };

        this.regService.create(request).subscribe({
            next: (response) => {
                if (response.success) {
                    this.currentRequest = response.data;
                    this.results = [];
                    this.form.get('inputData')?.reset();
                    this.notificationService.success('Đã tạo yêu cầu thành công');
                    this.subscribeToWebSocket(response.data.id);
                    this.loadMyRequests();
                }
            },
            error: (error) => {
                console.error('Error creating request:', error);
                this.notificationService.error(error?.error?.message || 'Lỗi khi tạo yêu cầu');
            },
            complete: () => {
                this.isSubmitting = false;
            }
        });
    }

    private subscribeToWebSocket(requestId: number): void {
        this.unsubscribeWebSocket();

        const userId = this.authService.getCurrentUser()?.id;
        if (!userId) return;

        const topic = `/topic/reg/${userId}`;
        this.wsUnsubscribe = this.wsService.subscribe<any>(topic, (data) => {
            if (data.requestId === requestId) {
                this.onResultReceived(data);
            }
        });
    }

    private unsubscribeWebSocket(): void {
        if (this.wsUnsubscribe) {
            this.wsUnsubscribe();
            this.wsUnsubscribe = null;
        }
    }

    private onResultReceived(data: any): void {
        const result: RegResult = {
            id: Date.now(),
            inputLine: data.inputLine,
            accountData: data.accountData,
            status: data.status,
            errorMessage: data.errorMessage,
            processedAt: data.processedAt
        };

        this.results.push(result);

        if (this.currentRequest) {
            this.currentRequest.successCount = data.successCount;
            this.currentRequest.failedCount = data.failedCount;
            this.currentRequest.totalCharged = data.totalCharged;
        }
    }

    loadMyRequests(): void {
        this.regService.getMyRequests(0, 10).subscribe({
            next: (response) => {
                if (response.success && response.data?.content) {
                    this.myRequests = response.data.content;
                }
            }
        });
    }

    viewRequest(request: RegRequest): void {
        this.regService.getById(request.id).subscribe({
            next: (response) => {
                if (response.success) {
                    this.currentRequest = response.data;
                    this.results = response.data.results || [];

                    if (request.status === 'PROCESSING') {
                        this.subscribeToWebSocket(request.id);
                    }
                }
            }
        });
    }

    cancelRequest(request: RegRequest): void {
        if (request.status !== 'PENDING') {
            this.notificationService.error('Chỉ có thể hủy yêu cầu đang chờ');
            return;
        }

        this.regService.cancel(request.id).subscribe({
            next: () => {
                this.notificationService.success('Đã hủy yêu cầu');
                this.loadMyRequests();
                if (this.currentRequest?.id === request.id) {
                    this.currentRequest = null;
                    this.results = [];
                }
            },
            error: () => this.notificationService.error('Lỗi khi hủy yêu cầu')
        });
    }

    copySuccessResults(): void {
        const successData = this.results
            .filter(r => r.status === 'SUCCESS' && r.accountData)
            .map(r => r.accountData)
            .join('\n');

        if (successData) {
            navigator.clipboard.writeText(successData);
            this.notificationService.success('Đã copy kết quả thành công');
        } else {
            this.notificationService.warning('Không có kết quả thành công để copy');
        }
    }

    getStatusClass(status: RegResultStatus): string {
        return status === 'SUCCESS' ? 'text-success' : status === 'FAILED' ? 'text-danger' : 'text-warning';
    }

    get progressPercent(): number {
        if (!this.currentRequest) return 0;
        const processed = this.currentRequest.successCount + this.currentRequest.failedCount;
        return Math.round((processed / this.currentRequest.quantity) * 100);
    }
}
