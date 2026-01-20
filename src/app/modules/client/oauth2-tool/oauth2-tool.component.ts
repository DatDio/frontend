import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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

    // Tab state
    activeTab: 'submit' | 'history' = 'submit';

    form!: FormGroup;
    isSubmitting = false;

    // Current request tracking (for submit tab)
    currentRequest: OAuth2Request | null = null;
    results: OAuth2Result[] = [];

    // History tab
    myRequests: OAuth2Request[] = [];
    loadingHistory = false;
    selectedRequest: OAuth2Request | null = null;

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
    resultRetentionDays = 7;  // Default, will be fetched

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
                    const price = response.data['oauth2.price_per_account'];
                    const maxAccounts = response.data['oauth2.max_accounts_per_request'];
                    if (price) this.pricePerAccount = parseInt(price, 10);
                    if (maxAccounts) this.maxAccountsPerRequest = parseInt(maxAccounts, 10);
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

    private checkPendingRequest(): void {
        this.oauth2Service.getMyPending().subscribe({
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
            this.notificationService.error(this.translateService.instant('OAUTH2.ENTER_INPUT'));
            return;
        }

        if (this.hasPendingRequest) {
            this.notificationService.error(this.translateService.instant('OAUTH2.CANCEL_PENDING_ONLY'));
            return;
        }

        if (this.inputLines.length > this.maxAccountsPerRequest) {
            this.notificationService.error(this.translateService.instant('VALIDATION.MAX_VALUE', { max: this.maxAccountsPerRequest }));
            return;
        }

        this.isSubmitting = true;

        const request: OAuth2RequestCreate = {
            inputList: this.inputLines.map(line => line.trim())
        };

        this.oauth2Service.create(request).subscribe({
            next: (response) => {
                if (response.success) {
                    this.currentRequest = response.data;
                    this.results = [];
                    this.notificationService.success(this.translateService.instant('OAUTH2.REQUEST_CREATED'));
                    this.subscribeToWebSocket(response.data.id);
                    this.hasPendingRequest = true;
                    this.loadMyRequests();
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

    private subscribeToWebSocket(requestId: number): void {
        this.unsubscribeWebSocket();

        const userId = this.authService.getCurrentUser()?.id;
        if (!userId) return;

        const topic = `/topic/oauth2/${userId}`;
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
                this.transactionService.refreshBalance();
            }
            return;
        }

        // Handle individual result update
        const result: OAuth2Result = {
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

    async cancelRequest(request: OAuth2Request): Promise<void> {
        if (request.status !== 'PENDING') {
            this.notificationService.error(this.translateService.instant('OAUTH2.CANCEL_PENDING_ONLY'));
            return;
        }

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
                this.hasPendingRequest = false;
                this.loadMyRequests();
                this.transactionService.refreshBalance();
                if (this.currentRequest?.id === request.id) {
                    this.currentRequest = null;
                    this.results = [];
                }
                if (this.selectedRequest?.id === request.id) {
                    this.selectedRequest = null;
                }
            },
            error: () => this.notificationService.error(this.translateService.instant('OAUTH2.CREATE_ERROR'))
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
        const failedData = this.results
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
        if (!this.currentRequest) return 0;
        const processed = this.currentRequest.successCount + this.currentRequest.failedCount;
        return Math.round((processed / this.currentRequest.quantity) * 100);
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
