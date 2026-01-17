import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RegService } from '../../../core/services/reg.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RegRequest, RegRequestCreate, RegRequestType, RegRequestStatus, RegResult, RegResultStatus } from '../../../core/models/reg-request.model';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { SystemSettingService } from '../../../core/services/system-setting.service';

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
    private readonly settingService = inject(SystemSettingService);

    // Tab state
    activeTab: 'submit' | 'history' = 'submit';

    form!: FormGroup;
    isSubmitting = false;

    // Current request tracking (for submit tab)
    currentRequest: RegRequest | null = null;
    results: RegResult[] = [];

    // History tab
    myRequests: RegRequest[] = [];
    loadingHistory = false;
    selectedRequest: RegRequest | null = null;

    // Pagination
    paginationConfig = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0
    };

    // Check if user has pending request
    hasPendingRequest = false;

    // Settings from backend
    pricePerAccount = 500;  // Default, will be fetched
    maxAccountsPerRequest = 100;  // Default, will be fetched

    // Math for template
    Math = Math;

    // WebSocket unsubscribe function
    private wsUnsubscribe: (() => void) | null = null;

    ngOnInit(): void {
        this.initForm();
        this.loadSettings();
        this.loadMyRequests();
        this.checkPendingRequest();
    }

    ngOnDestroy(): void {
        this.unsubscribeWebSocket();
    }

    private loadSettings(): void {
        this.settingService.getPublicSettings().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const price = response.data['reg.price_per_account'];
                    const maxAccounts = response.data['reg.max_accounts_per_request'];
                    if (price) this.pricePerAccount = parseInt(price, 10);
                    if (maxAccounts) this.maxAccountsPerRequest = parseInt(maxAccounts, 10);
                }
            }
        });
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
        return this.inputLines.length * this.pricePerAccount;
    }

    private checkPendingRequest(): void {
        this.regService.getMyPending().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const pending = response.data;
                    this.hasPendingRequest = true;
                    this.currentRequest = pending;
                    this.results = pending.results || [];

                    // Restore original input data to form
                    if (pending.inputList && pending.inputList.length > 0) {
                        const inputText = pending.inputList.join('\n');
                        this.form.get('inputData')?.setValue(inputText);
                        this.form.get('requestType')?.setValue(pending.requestType);
                    }

                    // Subscribe to WebSocket for real-time updates
                    if (pending.status === 'PROCESSING') {
                        this.subscribeToWebSocket(pending.id);
                    }
                } else {
                    this.hasPendingRequest = false;
                }
            }
        });
    }

    onSubmit(): void {
        if (this.form.invalid || this.inputLines.length === 0) {
            this.notificationService.error('Vui lòng nhập danh sách username');
            return;
        }

        if (this.hasPendingRequest) {
            this.notificationService.error('Bạn đang có yêu cầu đang xử lý. Vui lòng chờ hoàn thành.');
            return;
        }

        if (this.inputLines.length > this.maxAccountsPerRequest) {
            this.notificationService.error(`Số lượng tối đa là ${this.maxAccountsPerRequest} account mỗi lần gửi`);
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
                    // Giữ nguyên input để user xem lại
                    this.notificationService.success('Đã tạo yêu cầu thành công');
                    this.subscribeToWebSocket(response.data.id);
                    this.hasPendingRequest = true;
                    this.loadMyRequests();
                }
            },
            error: (error) => {
                console.error('Error creating request:', error);
                this.notificationService.error(error?.error?.message || 'Lỗi khi tạo yêu cầu');
                this.isSubmitting = false;
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

            // If completed, update pending status
            if (data.status === 'COMPLETED') {
                this.currentRequest.status = 'COMPLETED';
                this.hasPendingRequest = false;
                this.loadMyRequests();
            }
        }
    }

    loadMyRequests(): void {
        this.loadingHistory = true;
        const page = this.paginationConfig.currentPage - 1;

        this.regService.getMyRequests(page, this.paginationConfig.pageSize).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.myRequests = response.data.content || [];
                    this.paginationConfig.totalItems = response.data.totalElements || 0;
                    this.paginationConfig.totalPages = response.data.totalPages || 0;
                }
                this.loadingHistory = false;
            },
            error: () => {
                this.loadingHistory = false;
            }
        });
    }

    viewRequestDetail(request: RegRequest): void {
        this.regService.getById(request.id).subscribe({
            next: (response) => {
                if (response.success) {
                    this.selectedRequest = response.data;

                    // If viewing from submit tab and it's processing, show in main view
                    if (this.activeTab === 'submit' &&
                        (response.data.status === 'PENDING' || response.data.status === 'PROCESSING')) {
                        this.currentRequest = response.data;
                        this.results = response.data.results || [];
                        this.selectedRequest = null;
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
                this.hasPendingRequest = false;
                this.loadMyRequests();
                if (this.currentRequest?.id === request.id) {
                    this.currentRequest = null;
                    this.results = [];
                }
                if (this.selectedRequest?.id === request.id) {
                    this.selectedRequest = null;
                }
            },
            error: () => this.notificationService.error('Lỗi khi hủy yêu cầu')
        });
    }

    cancelCurrentRequest(): void {
        if (!this.currentRequest) return;
        this.cancelRequest(this.currentRequest);
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

    copyResultsFromRequest(request: RegRequest): void {
        if (!request.results) return;

        const successData = request.results
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

    // Pagination
    goToPage(page: number): void {
        if (page < 1 || page > this.paginationConfig.totalPages) return;
        this.paginationConfig.currentPage = page;
        this.loadMyRequests();
    }

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const total = this.paginationConfig.totalPages;
        const current = this.paginationConfig.currentPage;

        let start = Math.max(1, current - 2);
        let end = Math.min(total, current + 2);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }

    // Status helpers
    getStatusClass(status: RegResultStatus): string {
        return status === 'SUCCESS' ? 'text-success' : status === 'FAILED' ? 'text-danger' : 'text-warning';
    }

    get progressPercent(): number {
        if (!this.currentRequest) return 0;
        const processed = this.currentRequest.successCount + this.currentRequest.failedCount;
        return Math.round((processed / this.currentRequest.quantity) * 100);
    }

    getRequestStatusClass(status: RegRequestStatus): string {
        const statusMap: Record<string, string> = {
            'PENDING': 'pending',
            'PROCESSING': 'processing',
            'COMPLETED': 'completed',
            'CANCELLED': 'cancelled',
            'EXPIRED': 'expired'
        };
        return statusMap[status] || status.toLowerCase();
    }

    getRequestStatusLabel(status: RegRequestStatus): string {
        const statusMap: Record<string, string> = {
            'PENDING': 'Chờ xử lý',
            'PROCESSING': 'Đang xử lý',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy',
            'EXPIRED': 'Hết hạn'
        };
        return statusMap[status] || status;
    }

    getResultStatusClass(status: RegResultStatus): string {
        const statusMap: Record<string, string> = {
            'PENDING': 'pending',
            'SUCCESS': 'success',
            'FAILED': 'failed'
        };
        return statusMap[status] || status.toLowerCase();
    }
}
