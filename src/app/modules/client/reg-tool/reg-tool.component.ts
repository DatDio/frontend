import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RegService } from '../../../core/services/reg.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RegRequest, RegRequestCreate, RegRequestType, RegRequestStatus, RegResult, RegResultStatus } from '../../../core/models/reg-request.model';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { SystemSettingService } from '../../../core/services/system-setting.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TransactionService } from '../../../core/services/wallet.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
    selector: 'app-reg-tool',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, PaginationComponent],
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
    private readonly translateService = inject(TranslateService);
    private readonly confirmService = inject(ConfirmService);
    private readonly transactionService = inject(TransactionService);

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
        currentPage: 0,
        pageSize: 10,
        totalElements: 0,
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
            inputData: ['', [Validators.required, Validators.minLength(1)]],
            sharedPassword: ['']
        });
    }

    get inputLines(): string[] {
        const raw = this.form.get('inputData')?.value || '';
        return raw.split('\n').filter((line: string) => line.trim() !== '');
    }

    get estimatedTotal(): number {
        return this.inputLines.length * this.pricePerAccount;
    }

    get duplicateCount(): number {
        const seen = new Set<string>();
        let count = 0;
        for (const line of this.inputLines) {
            const key = line.trim().toLowerCase();
            if (seen.has(key)) {
                count++;
            } else {
                seen.add(key);
            }
        }
        return count;
    }

    filterDuplicates(): void {
        const seen = new Set<string>();
        const uniqueLines: string[] = [];
        for (const line of this.inputLines) {
            const key = line.trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueLines.push(line.trim());
            }
        }
        this.form.patchValue({ inputData: uniqueLines.join('\n') });
        this.notificationService.success(
            this.translateService.instant('REG.DUPLICATES_FILTERED', { count: this.duplicateCount })
        );
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
            this.notificationService.error(this.translateService.instant('REG.ENTER_INPUT'));
            return;
        }

        if (this.hasPendingRequest) {
            this.notificationService.error(this.translateService.instant('REG.CANCEL_PENDING_ONLY'));
            return;
        }

        if (this.inputLines.length > this.maxAccountsPerRequest) {
            this.notificationService.error(this.translateService.instant('VALIDATION.MAX_VALUE', { max: this.maxAccountsPerRequest }));
            return;
        }

        const requestType = this.form.get('requestType')?.value;
        const sharedPassword = this.form.get('sharedPassword')?.value?.trim() || '';

        // Validate sharedPassword for EMAIL_PASS type
        if (requestType === 'USER_PASS' && !sharedPassword) {
            this.notificationService.error(this.translateService.instant('REG.ENTER_PASSWORD'));
            return;
        }

        this.isSubmitting = true;

        // Build input list: for EMAIL_PASS, combine email with sharedPassword
        let inputList = this.inputLines;
        if (requestType === 'USER_PASS' && sharedPassword) {
            inputList = this.inputLines.map(email => `${email.trim()}|${sharedPassword}`);
        }

        const request: RegRequestCreate = {
            requestType: this.form.get('requestType')?.value as RegRequestType,
            inputList: inputList
        };

        this.regService.create(request).subscribe({
            next: (response) => {
                if (response.success) {
                    this.currentRequest = response.data;
                    this.results = [];
                    // Giữ nguyên input để user xem lại
                    this.notificationService.success(this.translateService.instant('REG.REQUEST_CREATED'));
                    this.subscribeToWebSocket(response.data.id);
                    this.hasPendingRequest = true;
                    this.loadMyRequests();
                    // Refresh balance after creating request
                    this.transactionService.refreshBalance();
                }
            },
            error: (error) => {
                console.error('Error creating request:', error);
                this.notificationService.error(error?.error?.message || this.translateService.instant('REG.CREATE_ERROR'));
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
        // Check if this is a request status update (completion notification)
        if (data.requestStatus && this.currentRequest) {
            this.currentRequest.status = data.requestStatus;
            this.currentRequest.successCount = data.successCount;
            this.currentRequest.failedCount = data.failedCount;
            this.currentRequest.totalCharged = data.totalCharged;

            if (data.requestStatus === 'COMPLETED' || data.requestStatus === 'CANCELLED') {
                this.hasPendingRequest = false;
                this.loadMyRequests();
                // Refresh balance when request is completed or cancelled (refund)
                this.transactionService.refreshBalance();
            }
            return;
        }

        // Handle individual result update
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
        this.loadingHistory = true;

        this.regService.getMyRequests(this.paginationConfig.currentPage, this.paginationConfig.pageSize).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.myRequests = response.data.content || [];
                    this.paginationConfig.totalElements = response.data.totalElements || 0;
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

    async cancelRequest(request: RegRequest): Promise<void> {
        if (request.status !== 'PENDING') {
            this.notificationService.error(this.translateService.instant('REG.CANCEL_PENDING_ONLY'));
            return;
        }

        // Confirm before canceling with styled modal
        const confirmed = await this.confirmService.confirm({
            title: this.translateService.instant('REG.CANCEL_REQUEST'),
            message: this.translateService.instant('REG.CANCEL_CONFIRM'),
            confirmText: this.translateService.instant('COMMON.CONFIRM'),
            cancelText: this.translateService.instant('COMMON.CANCEL'),
            confirmButtonClass: 'btn-danger'
        });

        if (!confirmed) {
            return;
        }

        this.regService.cancel(request.id).subscribe({
            next: () => {
                this.notificationService.success(this.translateService.instant('REG.REQUEST_CANCELLED'));
                this.hasPendingRequest = false;
                this.loadMyRequests();
                // Refresh balance after cancel (refund)
                this.transactionService.refreshBalance();
                if (this.currentRequest?.id === request.id) {
                    this.currentRequest = null;
                    this.results = [];
                }
                if (this.selectedRequest?.id === request.id) {
                    this.selectedRequest = null;
                }
            },
            error: () => this.notificationService.error(this.translateService.instant('REG.CREATE_ERROR'))
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
            this.notificationService.success(this.translateService.instant('REG.COPIED_SUCCESS'));
        } else {
            this.notificationService.warning(this.translateService.instant('REG.NO_SUCCESS_TO_COPY'));
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
            this.notificationService.success(this.translateService.instant('REG.COPIED_SUCCESS'));
        } else {
            this.notificationService.warning(this.translateService.instant('REG.NO_SUCCESS_TO_COPY'));
        }
    }

    copyFailedResults(): void {
        const failedData = this.results
            .filter(r => r.status === 'FAILED')
            .map(r => r.inputLine)
            .join('\n');

        if (failedData) {
            navigator.clipboard.writeText(failedData);
            this.notificationService.success(this.translateService.instant('REG.COPIED_FAILED'));
        } else {
            this.notificationService.warning(this.translateService.instant('REG.NO_FAILED_TO_COPY'));
        }
    }

    copyFailedFromRequest(request: RegRequest): void {
        if (!request.results) return;

        const failedData = request.results
            .filter(r => r.status === 'FAILED')
            .map(r => r.inputLine)
            .join('\n');

        if (failedData) {
            navigator.clipboard.writeText(failedData);
            this.notificationService.success(this.translateService.instant('REG.COPIED_FAILED'));
        } else {
            this.notificationService.warning(this.translateService.instant('REG.NO_FAILED_TO_COPY'));
        }
    }

    // Pagination
    handlePageChange(page: number): void {
        this.paginationConfig.currentPage = page;
        this.loadMyRequests();
    }

    handlePageSizeChange(size: number): void {
        this.paginationConfig.pageSize = size;
        this.paginationConfig.currentPage = 0;
        this.loadMyRequests();
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
            'PENDING': this.translateService.instant('REG.STATUS_PENDING'),
            'PROCESSING': this.translateService.instant('REG.STATUS_PROCESSING'),
            'COMPLETED': this.translateService.instant('REG.STATUS_COMPLETED'),
            'CANCELLED': this.translateService.instant('REG.STATUS_CANCELLED'),
            'EXPIRED': this.translateService.instant('REG.STATUS_EXPIRED')
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
