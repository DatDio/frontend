import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
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
    private readonly ngZone = inject(NgZone);

    // Tab state
    activeTab: 'submit' | 'history' = 'submit';

    form!: FormGroup;
    isSubmitting = false;

    // Active requests tracking (for submit tab)
    activeRequests: RegRequest[] = [];
    selectedActiveRequest: RegRequest | null = null;  // Currently viewing request

    // History tab
    myRequests: RegRequest[] = [];
    loadingHistory = false;
    selectedHistoryRequest: RegRequest | null = null;

    // Pagination
    paginationConfig = {
        currentPage: 0,
        pageSize: 10,
        totalElements: 0,
        totalPages: 0
    };

    // Settings from backend
    pricePerAccount = 500;  // Default, will be fetched
    maxAccountsPerRequest = 100;  // Default, will be fetched
    maxPendingRequests = 5;  // Default, will be fetched
    resultRetentionDays = 7;  // Default, will be fetched

    // Math for template
    Math = Math;

    // Timer for elapsed time
    elapsedTime = '00:00:00';
    private timerInterval: any = null;

    // WebSocket unsubscribe function
    private wsUnsubscribe: (() => void) | null = null;

    ngOnInit(): void {
        this.initForm();
        this.loadSettings();
        this.loadMyRequests();
        this.loadActiveRequests();
    }

    ngOnDestroy(): void {
        this.unsubscribeWebSocket();
        this.stopTimer();
    }

    private loadSettings(): void {
        this.settingService.getPublicSettings().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const price = response.data['reg.price_per_account'];
                    const maxAccounts = response.data['reg.max_accounts_per_request'];
                    const maxPending = response.data['reg.max_pending_requests'];
                    if (price) this.pricePerAccount = parseInt(price, 10);
                    if (maxAccounts) this.maxAccountsPerRequest = parseInt(maxAccounts, 10);
                    if (maxPending) this.maxPendingRequests = parseInt(maxPending, 10);
                    const retentionDays = response.data['reg.result_retention_days'];
                    if (retentionDays) this.resultRetentionDays = parseInt(retentionDays, 10);
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

    private loadActiveRequests(): void {
        this.regService.getMyActiveRequests().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.activeRequests = response.data;

                    // If no request selected and we have active requests, select the first one
                    if (!this.selectedActiveRequest && this.activeRequests.length > 0) {
                        this.selectActiveRequest(this.activeRequests[0]);
                    } else if (this.selectedActiveRequest) {
                        // Update the selected request if it's still in the list
                        const updated = this.activeRequests.find(r => r.id === this.selectedActiveRequest!.id);
                        if (updated) {
                            this.selectActiveRequest(updated);
                        } else if (this.activeRequests.length > 0) {
                            this.selectActiveRequest(this.activeRequests[0]);
                        } else {
                            this.selectedActiveRequest = null;
                            this.stopTimer();
                        }
                    }

                    // Subscribe to WebSocket for all active requests
                    this.subscribeToActiveRequests();
                }
            }
        });
    }

    selectActiveRequest(request: RegRequest): void {
        this.selectedActiveRequest = request;

        // Restore input data to form
        if (request.inputList && request.inputList.length > 0) {
            const inputText = request.inputList.join('\n');
            this.form.get('inputData')?.setValue(inputText);
            this.form.get('requestType')?.setValue(request.requestType);
        }

        // Start timer for PENDING or PROCESSING
        if (request.status === 'PENDING' || request.status === 'PROCESSING') {
            this.startTimer();
        } else {
            this.stopTimer();
        }
    }

    onSubmit(): void {
        if (this.form.invalid || this.inputLines.length === 0) {
            this.notificationService.error(this.translateService.instant('REG.ENTER_INPUT'));
            return;
        }

        if (this.activeRequests.length >= this.maxPendingRequests) {
            this.notificationService.error(this.translateService.instant('REG.MAX_REQUESTS_REACHED', { max: this.maxPendingRequests }));
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

        // Build request - inputList is pure email/username list, password sent separately
        const request: RegRequestCreate = {
            requestType: requestType as RegRequestType,
            inputList: this.inputLines.map(line => line.trim()),
            ...(requestType === 'USER_PASS' && sharedPassword ? { sharedPassword } : {})
        };

        this.regService.create(request).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    // Clear form
                    this.form.patchValue({ inputData: '', sharedPassword: '' });
                    this.notificationService.success(this.translateService.instant('REG.REQUEST_CREATED'));
                    this.loadMyRequests();

                    // Add the new request to the beginning of activeRequests
                    this.activeRequests.unshift(response.data);
                    // Select the newly created request
                    this.selectActiveRequest(response.data);
                    // Subscribe to WebSocket for the new request
                    this.subscribeToActiveRequests();
                    // Refresh balance
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

    private subscribeToActiveRequests(): void {
        this.unsubscribeWebSocket();

        const userId = this.authService.getCurrentUser()?.id;
        if (!userId || this.activeRequests.length === 0) return;

        const topic = `/topic/reg/${userId}`;
        this.wsUnsubscribe = this.wsService.subscribe<any>(topic, (data) => {
            this.onResultReceived(data);
        });
    }

    private unsubscribeWebSocket(): void {
        if (this.wsUnsubscribe) {
            this.wsUnsubscribe();
            this.wsUnsubscribe = null;
        }
    }

    // ==================== TIMER METHODS ====================

    /**
     * Start elapsed time timer based on pickedAt or createdAt timestamp
     * Runs outside Angular Zone to prevent hydration stability issues
     */
    private startTimer(): void {
        this.stopTimer();
        this.updateElapsedTime();
        this.ngZone.runOutsideAngular(() => {
            this.timerInterval = setInterval(() => {
                this.ngZone.run(() => this.updateElapsedTime());
            }, 1000);
        });
    }

    /**
     * Stop the timer
     */
    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Calculate and update elapsed time from start timestamp
     * Uses pickedAt if available (PROCESSING), otherwise createdAt (PENDING)
     */
    private updateElapsedTime(): void {
        if (!this.selectedActiveRequest) {
            this.elapsedTime = '00:00:00';
            return;
        }

        // Use pickedAt for PROCESSING, createdAt for PENDING
        const startTime = this.selectedActiveRequest.pickedAt || this.selectedActiveRequest.createdAt;
        if (!startTime) {
            this.elapsedTime = '00:00:00';
            return;
        }

        const start = new Date(startTime).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - start) / 1000));

        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        this.elapsedTime = [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    }

    private onResultReceived(data: any): void {
        const requestId = data.requestId;
        const requestIndex = this.activeRequests.findIndex(r => r.id === requestId);

        if (requestIndex === -1) {
            // Request not in active list, refresh list
            this.loadActiveRequests();
            this.loadMyRequests();
            return;
        }

        // Update the request in the list
        const request = this.activeRequests[requestIndex];

        // Check if this is a request status update (completion notification)
        if (data.requestStatus) {
            request.status = data.requestStatus;
            request.successCount = data.successCount;
            request.failedCount = data.failedCount;
            request.totalCharged = data.totalCharged;

            // Replace the object in the array to trigger Angular change detection
            const updatedRequest = { ...request };
            this.activeRequests[requestIndex] = updatedRequest;

            if (data.requestStatus === 'COMPLETED' || data.requestStatus === 'CANCELLED') {
                // DON'T remove from active list - keep visible until page reload
                // Just refresh history list and balance
                this.loadMyRequests();
                this.transactionService.refreshBalance();

                // Stop timer for completed/cancelled request
                if (this.selectedActiveRequest?.id === requestId) {
                    this.selectedActiveRequest = updatedRequest;
                    this.stopTimer();
                }
            } else if (this.selectedActiveRequest?.id === requestId) {
                this.selectedActiveRequest = updatedRequest;
            }
            return;
        }

        // Handle individual result update
        // Only update counts if they are greater than current (prevent timeout messages from overwriting with 0)
        if (data.successCount > request.successCount) {
            request.successCount = data.successCount;
        }
        if (data.failedCount > request.failedCount) {
            request.failedCount = data.failedCount;
        }
        if (data.totalCharged != null) {
            request.totalCharged = data.totalCharged;
        }

        // Add result to request's results array if it exists
        if (!request.results) {
            request.results = [];
        }
        request.results.push({
            id: Date.now(),
            inputLine: data.inputLine,
            accountData: data.accountData,
            status: data.status,
            errorMessage: data.errorMessage,
            processedAt: data.processedAt
        });

        // Replace the object in the array to trigger Angular change detection
        const updatedRequest = { ...request };
        this.activeRequests[requestIndex] = updatedRequest;

        // Update selected request if this is it
        if (this.selectedActiveRequest?.id === requestId) {
            this.selectedActiveRequest = updatedRequest;
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
                    this.selectedHistoryRequest = response.data;
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
                // Refresh lists and balance
                this.loadActiveRequests();
                this.loadMyRequests();
                this.transactionService.refreshBalance();
            },
            error: () => this.notificationService.error(this.translateService.instant('REG.CREATE_ERROR'))
        });
    }

    cancelSelectedRequest(): void {
        if (!this.selectedActiveRequest) return;
        this.cancelRequest(this.selectedActiveRequest);
    }

    copySuccessResults(): void {
        if (!this.selectedActiveRequest?.results) return;

        const successData = this.selectedActiveRequest.results
            .filter((r: RegResult) => r.status === 'SUCCESS' && r.accountData)
            .map((r: RegResult) => r.accountData)
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
        if (!this.selectedActiveRequest?.results) return;

        const failedData = this.selectedActiveRequest.results
            .filter((r: RegResult) => r.status === 'FAILED')
            .map((r: RegResult) => r.inputLine)
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
        if (!this.selectedActiveRequest) return 0;
        const processed = this.selectedActiveRequest.successCount + this.selectedActiveRequest.failedCount;
        return Math.round((processed / this.selectedActiveRequest.quantity) * 100);
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
