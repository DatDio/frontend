import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MailsNgonProductMapping, MailsNgonSettings, MailsNgonService } from '../../../../../core/services/mailsngon.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { PaginationComponent, PaginationConfig } from '../../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../../shared/services/pagination.service';
import { ActiveStatusBadgeComponent } from '../../../../../shared/components/active-status-badge/active-status-badge.component';
import { WebSocketService } from '../../../../../core/services/websocket.service';
import { StockSyncResultMessage } from '../../../../../core/models/stock-sync-result-message.model';
import { MailsNgonMappingCreateModalComponent } from '../create-modal/create-modal.component';

@Component({
    selector: 'app-mailsngon-mapping-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        PaginationComponent,
        ActiveStatusBadgeComponent,
        MailsNgonMappingCreateModalComponent
    ],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss'
})
export class MailsNgonMappingListComponent implements OnInit, OnDestroy {
    private readonly mailsNgonService = inject(MailsNgonService);
    private readonly notificationService = inject(NotificationService);
    private readonly confirmService = inject(ConfirmService);
    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly paginationService = inject(PaginationService);
    private readonly webSocketService = inject(WebSocketService);

    mappings: MailsNgonProductMapping[] = [];
    loading = true;
    syncing = false;
    showCreateModal = false;
    showEditModal = false;
    selectedMapping: MailsNgonProductMapping | null = null;
    filterLocalProductId: number | null = null;

    // Settings & countdown
    settings: MailsNgonSettings = {};
    countdown: number = 0;
    private countdownInterval: any = null;
    private stockSyncUnsub?: () => void;

    paginationConfig: PaginationConfig = {
        currentPage: 0,
        totalPages: 1,
        pageSize: 10,
        totalElements: 0
    };

    formSearch!: FormGroup;

    ngOnInit(): void {
        this.formSearch = this.fb.group({
            status: new FormControl('')
        });

        this.loadSettings();

        this.stockSyncUnsub = this.webSocketService.subscribe<StockSyncResultMessage>(
            '/topic/admin/stock-sync',
            (payload) => this.handleStockSyncResult(payload)
        );

        this.startCountdownTimer();

        this.route.queryParams.subscribe(params => {
            this.filterLocalProductId = params['localProductId'] ? Number(params['localProductId']) : null;
            this.paginationConfig.currentPage = 0;
            this.loadMappings();
        });
    }

    ngOnDestroy(): void {
        this.stockSyncUnsub?.();
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    private loadSettings(): void {
        this.mailsNgonService.getSettings().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.settings = response.data;
                    if (this.settings.autoSyncEnabled && this.settings.syncIntervalSeconds) {
                        this.countdown = this.settings.syncIntervalSeconds;
                    }
                }
            }
        });
    }

    private startCountdownTimer(): void {
        this.countdownInterval = setInterval(() => {
            if (this.settings.autoSyncEnabled && this.settings.syncIntervalSeconds) {
                const next = this.countdown - 1;
                this.countdown = next <= 0 ? this.settings.syncIntervalSeconds : next;
            }
        }, 1000);
    }

    private handleStockSyncResult(result: StockSyncResultMessage): void {
        if (!result?.updates?.length) return;
        if (result.providerName !== 'MailsNgon' && result.providerId !== 0) return;

        // Reset countdown
        if (this.settings.autoSyncEnabled && this.settings.syncIntervalSeconds) {
            this.countdown = this.settings.syncIntervalSeconds;
        }

        const updateMap = new Map(result.updates.map(update => [update.mappingId, update]));
        this.mappings = this.mappings.map(mapping => {
            const syncUpdate = updateMap.get(mapping.id!);
            if (!syncUpdate) return mapping;
            const localPrice = mapping.localPrice;
            const externalPrice = syncUpdate.externalPrice;
            const profitPerItem = (localPrice != null && externalPrice != null) ? localPrice - externalPrice : undefined;
            const profitPercent = (profitPerItem != null && externalPrice != null && externalPrice > 0)
                ? (profitPerItem * 100 / externalPrice)
                : undefined;
            return {
                ...mapping,
                lastSyncedStock: syncUpdate.lastSyncedStock,
                externalPrice: syncUpdate.externalPrice,
                profitPerItem,
                profitPercent
            };
        });
    }

    handleSearch(): void {
        this.paginationConfig.currentPage = 0;
        this.loadMappings();
    }

    handlePageChange(page: number): void {
        this.paginationConfig.currentPage = page;
        this.loadMappings();
    }

    selectPageSize(pageSize: number): void {
        this.paginationConfig.currentPage = 0;
        this.paginationConfig.pageSize = pageSize;
        this.loadMappings();
    }

    clearForm(): void {
        this.formSearch.reset({ status: '' });
        this.filterLocalProductId = null;
        this.paginationConfig.currentPage = 0;
        this.loadMappings();
    }

    private loadMappings(): void {
        this.loading = true;
        const statusValue = this.formSearch.get('status')?.value;
        this.mailsNgonService.listMappings({
            localProductId: this.filterLocalProductId ?? undefined,
            status: statusValue ? Number(statusValue) : undefined,
            page: this.paginationConfig.currentPage,
            limit: this.paginationConfig.pageSize
        }).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.mappings = response.data.content || [];
                    this.paginationConfig = this.paginationService.extractPaginationInfo(response.data);
                }
                this.loading = false;
            },
            error: () => {
                this.notificationService.error('Lỗi khi tải danh sách mapping MailsNgon');
                this.loading = false;
            }
        });
    }

    onCreateClick(): void {
        this.showCreateModal = true;
    }

    onCreateModalClose(): void {
        this.showCreateModal = false;
    }

    onCreateSuccess(): void {
        this.showCreateModal = false;
        this.loadMappings();
    }

    onEditClick(mapping: MailsNgonProductMapping): void {
        this.selectedMapping = mapping;
        this.showEditModal = true;
    }

    onEditModalClose(): void {
        this.selectedMapping = null;
        this.showEditModal = false;
    }

    onEditSuccess(): void {
        this.selectedMapping = null;
        this.showEditModal = false;
        this.loadMappings();
    }

    async onDeleteClick(id: number): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: '⚠️ CẢNH BÁO',
            message: 'Xóa mapping này sẽ xóa luôn local product tương ứng nếu chưa có đơn hàng. Bạn có chắc muốn tiếp tục?',
            confirmText: 'Xóa vĩnh viễn',
            confirmButtonClass: 'btn-danger',
            cancelText: 'Hủy'
        });

        if (!confirmed) return;

        this.mailsNgonService.deleteMapping(id).subscribe({
            next: (response) => {
                if (response.success) {
                    this.notificationService.success('Xóa mapping MailsNgon thành công');
                    this.loadMappings();
                }
            },
            error: (error) => {
                this.notificationService.error(error?.error?.message || 'Lỗi khi xóa mapping MailsNgon');
            }
        });
    }

    onSyncStock(): void {
        this.syncing = true;
        this.mailsNgonService.syncStock().subscribe({
            next: (response) => {
                if (response.success) {
                    this.notificationService.success('Sync stock MailsNgon thành công');
                    this.loadMappings();
                }
                this.syncing = false;
            },
            error: (error) => {
                this.notificationService.error(error?.error?.message || 'Lỗi khi sync stock MailsNgon');
                this.syncing = false;
            }
        });
    }

    formatCurrency(amount?: number): string {
        if (amount == null) return '—';
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    }
}
