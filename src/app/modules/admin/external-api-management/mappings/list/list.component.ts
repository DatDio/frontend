import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExternalApiService, ExternalApiProvider, ExternalProductMapping, MappingFilter } from '../../../../../core/services/external-api.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { PaginationComponent, PaginationConfig } from '../../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../../shared/services/pagination.service';
import { ActiveStatusBadgeComponent } from '../../../../../shared/components/active-status-badge/active-status-badge.component';
import { ExternalProductMappingCreateModalComponent } from '../create-modal/create-modal.component';
import { WebSocketService } from '../../../../../core/services/websocket.service';
import { StockSyncResultMessage } from '../../../../../core/models/stock-sync-result-message.model';

@Component({
    selector: 'app-external-product-mapping-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        PaginationComponent,
        ActiveStatusBadgeComponent,
        ExternalProductMappingCreateModalComponent
    ],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss'
})
export class ExternalProductMappingListComponent implements OnInit, OnDestroy {
    private readonly externalApiService = inject(ExternalApiService);
    private readonly notificationService = inject(NotificationService);
    private readonly confirmService = inject(ConfirmService);
    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly paginationService = inject(PaginationService);
    private readonly webSocketService = inject(WebSocketService);

    mappings: ExternalProductMapping[] = [];
    providers: ExternalApiProvider[] = [];
    loading = true;
    showCreateModal = false;
    showEditModal = false;
    selectedProviderId: number | null = null;
    selectedMapping: ExternalProductMapping | null = null;
    filterLocalProductId: number | null = null;

    // WebSocket & countdown
    private stockSyncUnsub?: () => void;
    countdownByProviderId: Record<number, number> = {};
    private countdownInterval: any = null;

    paginationConfig: PaginationConfig = {
        currentPage: 0,
        totalPages: 1,
        pageSize: 10,
        totalElements: 0
    };

    formSearch!: FormGroup;

    ngOnInit(): void {
        this.initForm();
        this.loadProviders();
        this.subscribeToStockSync();
        this.startCountdownTimer();

        // Check query param for providerId and localProductId
        this.route.queryParams.subscribe(params => {
            if (params['providerId']) {
                this.selectedProviderId = Number(params['providerId']);
                this.formSearch.patchValue({ providerId: this.selectedProviderId });
            }
            if (params['localProductId']) {
                this.filterLocalProductId = Number(params['localProductId']);
            } else {
                this.filterLocalProductId = null;
            }
            this.loadMappings();
        });
    }

    ngOnDestroy(): void {
        this.stockSyncUnsub?.();
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    private subscribeToStockSync(): void {
        this.stockSyncUnsub = this.webSocketService.subscribe<StockSyncResultMessage>(
            '/topic/admin/stock-sync',
            (payload) => this.handleStockSyncResult(payload)
        );
    }

    private handleStockSyncResult(result: StockSyncResultMessage): void {
        if (!result?.providerId) return;

        // Reset countdown for this provider
        const provider = this.providers.find(p => p.id === result.providerId);
        if (provider?.syncIntervalSeconds) {
            this.countdownByProviderId[result.providerId] = provider.syncIntervalSeconds;
        }

        // Update mapping data in-place
        if (!result.updates?.length) return;
        const updateMap = new Map(result.updates.map(u => [u.mappingId, u]));
        this.mappings = this.mappings.map(mapping => {
            const syncUpdate = updateMap.get(mapping.id!);
            if (syncUpdate) {
                const newExternalPrice = syncUpdate.externalPrice;
                const localPrice = mapping.localPrice;
                const profit = (localPrice != null && newExternalPrice != null) ? localPrice - newExternalPrice : undefined;
                const profitPercent = (profit != null && newExternalPrice != null && newExternalPrice > 0)
                    ? (profit * 100 / newExternalPrice) : undefined;
                return {
                    ...mapping,
                    lastSyncedStock: syncUpdate.lastSyncedStock,
                    externalPrice: newExternalPrice,
                    profitPerItem: profit,
                    profitPercent: profitPercent
                };
            }
            return mapping;
        });
    }

    private initForm(): void {
        this.formSearch = this.fb.group({
            providerId: new FormControl(''),
            status: new FormControl('')
        });
    }

    private loadProviders(): void {
        this.externalApiService.getActiveProviders().subscribe({
            next: (response: any) => {
                if (response.success) {
                    this.providers = response.data || [];
                    this.initCountdowns();
                }
            }
        });
    }

    private startCountdownTimer(): void {
        this.countdownInterval = setInterval(() => {
            for (const provider of this.providers) {
                if (provider.id && provider.autoSyncEnabled && provider.syncIntervalSeconds) {
                    const id = provider.id;
                    const current = this.countdownByProviderId[id] ?? provider.syncIntervalSeconds;
                    const next = current - 1;
                    this.countdownByProviderId[id] = next <= 0 ? provider.syncIntervalSeconds : next;
                }
            }
        }, 1000);
    }

    private initCountdowns(): void {
        for (const provider of this.providers) {
            if (provider.id && provider.autoSyncEnabled && provider.syncIntervalSeconds) {
                this.countdownByProviderId[provider.id] ??= provider.syncIntervalSeconds;
            }
        }
    }

    getProviderSyncInterval(providerId: number): number | null {
        const provider = this.providers.find(p => p.id === providerId);
        return provider?.autoSyncEnabled ? (provider.syncIntervalSeconds ?? null) : null;
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
        this.formSearch.reset({ providerId: '', status: '' });
        this.filterLocalProductId = null;
        this.paginationConfig.currentPage = 0;
        this.loadMappings();
    }

    private loadMappings(): void {
        this.loading = true;
        const formData = this.formSearch.getRawValue();
        const filter: MappingFilter = {
            providerId: formData.providerId ? Number(formData.providerId) : undefined,
            localProductId: this.filterLocalProductId ?? undefined,
            status: formData.status ? Number(formData.status) : undefined,
            page: this.paginationConfig.currentPage,
            limit: this.paginationConfig.pageSize
        };

        console.log('[DEBUG] loadMappings filter:', JSON.stringify(filter), 'filterLocalProductId:', this.filterLocalProductId);

        this.externalApiService.listMappings(filter).subscribe({
            next: (response: any) => {
                if (response.success && response.data) {
                    this.mappings = response.data.content || [];
                    this.paginationConfig = this.paginationService.extractPaginationInfo(response.data);
                }
                this.loading = false;
            },
            error: (error: any) => {
                this.notificationService.error('Lỗi khi tải danh sách mappings');
                this.loading = false;
            }
        });
    }

    onCreateClick(): void {
        const providerId = this.formSearch.get('providerId')?.value;
        this.selectedProviderId = providerId ? Number(providerId) : null;
        this.showCreateModal = true;
    }

    onCreateModalClose(): void {
        this.showCreateModal = false;
    }

    onCreateSuccess(): void {
        this.showCreateModal = false;
        this.loadMappings();
    }

    onEditClick(mapping: ExternalProductMapping): void {
        this.selectedMapping = mapping;
        this.showEditModal = true;
    }

    onEditModalClose(): void {
        this.showEditModal = false;
        this.selectedMapping = null;
    }

    onEditSuccess(): void {
        this.showEditModal = false;
        this.selectedMapping = null;
        this.loadMappings();
    }

    async onDeleteClick(id: number): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: '⚠️ CẢNH BÁO',
            message: 'Khi xóa Mapping, sản phẩm Local tương ứng cũng sẽ bị xóa vĩnh viễn (nếu chưa có đơn hàng). Bạn có chắc muốn tiếp tục?',
            confirmText: 'Xóa vĩnh viễn',
            confirmButtonClass: 'btn-danger',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            this.externalApiService.deleteMapping(id).subscribe({
                next: (response: any) => {
                    if (response.success) {
                        this.notificationService.success('Xóa mapping thành công');
                        this.loadMappings();
                    }
                },
                error: (error: any) => {
                    this.notificationService.error(error?.error?.message || 'Lỗi khi xóa mapping');
                }
            });
        }
    }

    onSyncStock(providerId: number): void {
        this.externalApiService.syncStock(providerId).subscribe({
            next: (response: any) => {
                if (response.success) {
                    this.notificationService.success('Sync stock thành công');
                    this.loadMappings();
                }
            },
            error: (error: any) => {
                this.notificationService.error('Lỗi khi sync stock');
            }
        });
    }

    formatCurrency(amount: number | undefined): string {
        if (!amount) return '—';
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    }
}
