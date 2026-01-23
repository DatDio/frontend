import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OAuth2Service } from '../../../core/services/oauth2.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OAuth2Request, OAuth2RequestCreate, OAuth2RequestStatus, OAuth2Result, OAuth2ResultStatus } from '../../../core/models/oauth2-request.model';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { SystemSettingService } from '../../../core/services/system-setting.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TransactionService } from '../../../core/services/wallet.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
    selector: 'app-oauth2-tool',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, PaginationComponent],
    templateUrl: './oauth2-tool.component.html',
    styleUrl: './oauth2-tool.component.scss'
})
export class OAuth2ToolComponent implements OnInit, OnDestroy {
    private readonly oauth2Service = inject(OAuth2Service);
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

    // Active requests tracking (for submit tab) - supports multiple requests
    activeRequests: OAuth2Request[] = [];
    selectedActiveRequest: OAuth2Request | null = null;  // Currently viewing request

    // History tab
    myRequests: OAuth2Request[] = [];
    loadingHistory = false;
    selectedHistoryRequest: OAuth2Request | null = null;

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
                    const price = response.data['oauth2.price_per_account'];
                    const maxAccounts = response.data['oauth2.max_accounts_per_request'];
                    const maxPending = response.data['oauth2.max_pending_requests'];
                    if (price) this.pricePerAccount = parseInt(price, 10);
                    if (maxAccounts) this.maxAccountsPerRequest = parseInt(maxAccounts, 10);
                    if (maxPending) this.maxPendingRequests = parseInt(maxPending, 10);
                    const retentionDays = response.data['oauth2.result_retention_days'];
                    if (retentionDays) this.resultRetentionDays = parseInt(retentionDays, 10);
                }
            }
        });
    }

    private initForm(): void {
        this.form = this.fb.group({
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

    /**
     * Validate email|pass format
     * Returns count of invalid lines
     */
    get invalidFormatCount(): number {
        const emailPassRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\|.+$/;
        let count = 0;
        for (const line of this.inputLines) {
            if (!emailPassRegex.test(line.trim())) {
                count++;
            }
        }
        return count;
    }

    /**
     * Get list of invalid format lines for display
     */
    get invalidLines(): string[] {
        const emailPassRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\|.+$/;
        return this.inputLines.filter(line => !emailPassRegex.test(line.trim()));
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
            this.translateService.instant('OAUTH2.DUPLICATES_FILTERED', { count: this.duplicateCount })
        );
    }

    private loadActiveRequests(): void {
        this.oauth2Service.getMyActiveRequests().subscribe({
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

    selectActiveRequest(request: OAuth2Request): void {
        this.selectedActiveRequest = request;

        // Restore input data to form
        if (request.inputList && request.inputList.length > 0) {
            const inputText = request.inputList.join('\n');
            this.form.get('inputData')?.setValue(inputText);
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
            this.notificationService.error(this.translateService.instant('OAUTH2.ENTER_INPUT'));
            return;
        }

        if (this.activeRequests.length >= this.maxPendingRequests) {
            this.notificationService.error(this.translateService.instant('OAUTH2.MAX_REQUESTS_REACHED', { max: this.maxPendingRequests }));
            return;
        }

        if (this.inputLines.length > this.maxAccountsPerRequest) {
            this.notificationService.error(this.translateService.instant('VALIDATION.MAX_VALUE', { max: this.maxAccountsPerRequest }));
            return;
        }

        // Validate email|pass format
        if (this.invalidFormatCount > 0) {
            this.notificationService.error(
                this.translateService.instant('OAUTH2.INVALID_FORMAT', { count: this.invalidFormatCount })
            );
            return;
        }

        this.isSubmitting = true;

        const request: OAuth2RequestCreate = {
            inputList: this.inputLines.map(line => line.trim())
        };

        this.oauth2Service.create(request).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    // Clear form
                    this.form.patchValue({ inputData: '' });
                    this.notificationService.success(this.translateService.instant('OAUTH2.REQUEST_CREATED'));
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
                this.notificationService.error(error?.error?.message || this.translateService.instant('OAUTH2.CREATE_ERROR'));
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

        const topic = `/topic/oauth2/${userId}`;
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

        this.oauth2Service.getMyRequests(this.paginationConfig.currentPage, this.paginationConfig.pageSize).subscribe({
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

    viewRequestDetail(request: OAuth2Request): void {
        this.oauth2Service.getById(request.id).subscribe({
            next: (response) => {
                if (response.success) {
                    this.selectedHistoryRequest = response.data;
                }
            }
        });
    }

    async cancelRequest(request: OAuth2Request): Promise<void> {
        if (request.status !== 'PENDING') {
            this.notificationService.error(this.translateService.instant('OAUTH2.CANCEL_PENDING_ONLY'));
            return;
        }

        // Confirm before canceling with styled modal
        const confirmed = await this.confirmService.confirm({
            title: this.translateService.instant('OAUTH2.CANCEL_REQUEST'),
            message: this.translateService.instant('OAUTH2.CANCEL_CONFIRM'),
            confirmText: this.translateService.instant('COMMON.CONFIRM'),
            cancelText: this.translateService.instant('COMMON.CANCEL'),
            confirmButtonClass: 'btn-danger'
        });

        if (!confirmed) {
            return;
        }

        this.oauth2Service.cancel(request.id).subscribe({
            next: () => {
                this.notificationService.success(this.translateService.instant('OAUTH2.REQUEST_CANCELLED'));
                // Refresh lists and balance
                this.loadActiveRequests();
                this.loadMyRequests();
                this.transactionService.refreshBalance();
            },
            error: () => this.notificationService.error(this.translateService.instant('OAUTH2.CREATE_ERROR'))
        });
    }

    cancelSelectedRequest(): void {
        if (!this.selectedActiveRequest) return;
        this.cancelRequest(this.selectedActiveRequest);
    }

    copySuccessResults(): void {
        if (!this.selectedActiveRequest?.results) return;

        const successData = this.selectedActiveRequest.results
            .filter((r: OAuth2Result) => r.status === 'SUCCESS' && r.accountData)
            .map((r: OAuth2Result) => r.accountData)
            .join('\n');

        if (successData) {
            navigator.clipboard.writeText(successData);
            this.notificationService.success(this.translateService.instant('OAUTH2.COPIED_SUCCESS'));
        } else {
            this.notificationService.warning(this.translateService.instant('OAUTH2.NO_SUCCESS_TO_COPY'));
        }
    }

    copyResultsFromRequest(request: OAuth2Request): void {
        if (!request.results) return;

        const successData = request.results
            .filter(r => r.status === 'SUCCESS' && r.accountData)
            .map(r => r.accountData)
            .join('\n');

        if (successData) {
            navigator.clipboard.writeText(successData);
            this.notificationService.success(this.translateService.instant('OAUTH2.COPIED_SUCCESS'));
        } else {
            this.notificationService.warning(this.translateService.instant('OAUTH2.NO_SUCCESS_TO_COPY'));
        }
    }

    copyFailedResults(): void {
        if (!this.selectedActiveRequest?.results) return;

        const failedData = this.selectedActiveRequest.results
            .filter((r: OAuth2Result) => r.status === 'FAILED')
            .map((r: OAuth2Result) => r.inputLine)
            .join('\n');

        if (failedData) {
            navigator.clipboard.writeText(failedData);
            this.notificationService.success(this.translateService.instant('OAUTH2.COPIED_FAILED'));
        } else {
            this.notificationService.warning(this.translateService.instant('OAUTH2.NO_FAILED_TO_COPY'));
        }
    }

    copyFailedFromRequest(request: OAuth2Request): void {
        if (!request.results) return;

        const failedData = request.results
            .filter(r => r.status === 'FAILED')
            .map(r => r.inputLine)
            .join('\n');

        if (failedData) {
            navigator.clipboard.writeText(failedData);
            this.notificationService.success(this.translateService.instant('OAUTH2.COPIED_FAILED'));
        } else {
            this.notificationService.warning(this.translateService.instant('OAUTH2.NO_FAILED_TO_COPY'));
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
    getStatusClass(status: OAuth2ResultStatus): string {
        return status === 'SUCCESS' ? 'text-success' : status === 'FAILED' ? 'text-danger' : 'text-warning';
    }

    get progressPercent(): number {
        if (!this.selectedActiveRequest) return 0;
        const processed = this.selectedActiveRequest.successCount + this.selectedActiveRequest.failedCount;
        return Math.round((processed / this.selectedActiveRequest.quantity) * 100);
    }

    getRequestStatusClass(status: OAuth2RequestStatus): string {
        const statusMap: Record<string, string> = {
            'PENDING': 'pending',
            'PROCESSING': 'processing',
            'COMPLETED': 'completed',
            'CANCELLED': 'cancelled',
            'EXPIRED': 'expired'
        };
        return statusMap[status] || status.toLowerCase();
    }

    getRequestStatusLabel(status: OAuth2RequestStatus): string {
        const statusMap: Record<string, string> = {
            'PENDING': this.translateService.instant('OAUTH2.STATUS_PENDING'),
            'PROCESSING': this.translateService.instant('OAUTH2.STATUS_PROCESSING'),
            'COMPLETED': this.translateService.instant('OAUTH2.STATUS_COMPLETED'),
            'CANCELLED': this.translateService.instant('OAUTH2.STATUS_CANCELLED'),
            'EXPIRED': this.translateService.instant('OAUTH2.STATUS_EXPIRED')
        };
        return statusMap[status] || status;
    }

    getResultStatusClass(status: OAuth2ResultStatus): string {
        const statusMap: Record<string, string> = {
            'PENDING': 'pending',
            'SUCCESS': 'success',
            'FAILED': 'failed'
        };
        return statusMap[status] || status.toLowerCase();
    }
}
