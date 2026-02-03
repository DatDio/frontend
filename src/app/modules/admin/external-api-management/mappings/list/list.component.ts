import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExternalApiService, ExternalApiProvider, ExternalProductMapping, MappingFilter } from '../../../../../core/services/external-api.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { PaginationComponent, PaginationConfig } from '../../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../../shared/services/pagination.service';
import { ActiveStatusBadgeComponent } from '../../../../../shared/components/active-status-badge/active-status-badge.component';
import { ExternalProductMappingCreateModalComponent } from '../create-modal/create-modal.component';

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
export class ExternalProductMappingListComponent implements OnInit {
    private readonly externalApiService = inject(ExternalApiService);
    private readonly notificationService = inject(NotificationService);
    private readonly confirmService = inject(ConfirmService);
    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly paginationService = inject(PaginationService);

    mappings: ExternalProductMapping[] = [];
    providers: ExternalApiProvider[] = [];
    loading = true;
    showCreateModal = false;
    showEditModal = false;
    selectedProviderId: number | null = null;
    selectedMapping: ExternalProductMapping | null = null;

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

        // Check query param for providerId
        this.route.queryParams.subscribe(params => {
            if (params['providerId']) {
                this.selectedProviderId = Number(params['providerId']);
                this.formSearch.patchValue({ providerId: this.selectedProviderId });
            }
            this.loadMappings();
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
                }
            }
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
        this.formSearch.reset({ providerId: '', status: '' });
        this.paginationConfig.currentPage = 0;
        this.loadMappings();
    }

    private loadMappings(): void {
        this.loading = true;
        const formData = this.formSearch.getRawValue();
        const filter: MappingFilter = {
            providerId: formData.providerId ? Number(formData.providerId) : undefined,
            status: formData.status ? Number(formData.status) : undefined,
            page: this.paginationConfig.currentPage,
            limit: this.paginationConfig.pageSize
        };

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
