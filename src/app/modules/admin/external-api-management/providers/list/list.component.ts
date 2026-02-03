import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExternalApiService, ExternalApiProvider, ProviderFilter } from '../../../../../core/services/external-api.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { PaginationComponent, PaginationConfig } from '../../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../../shared/services/pagination.service';
import { ActiveStatusBadgeComponent } from '../../../../../shared/components/active-status-badge/active-status-badge.component';
import { ExternalApiProviderDetailModalComponent } from '../detail-modal';

@Component({
    selector: 'app-external-api-provider-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        PaginationComponent,
        ActiveStatusBadgeComponent,
        ExternalApiProviderDetailModalComponent
    ],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss'
})
export class ExternalApiProviderListComponent implements OnInit {
    private readonly externalApiService = inject(ExternalApiService);
    private readonly notificationService = inject(NotificationService);
    private readonly confirmService = inject(ConfirmService);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    private readonly paginationService = inject(PaginationService);

    providers: ExternalApiProvider[] = [];
    loading = true;
    balanceByProviderId: Record<number, string> = {};
    showDetailModal = false;
    selectedProvider: ExternalApiProvider | null = null;
    isCreateMode = false;

    paginationConfig: PaginationConfig = {
        currentPage: 0,
        totalPages: 1,
        pageSize: 10,
        totalElements: 0
    };

    dataFormSearch: ProviderFilter = {};
    formSearch!: FormGroup;

    ngOnInit(): void {
        this.initForm();
        this.loadProviders();
    }

    private initForm(): void {
        this.formSearch = this.fb.group({
            name: new FormControl(''),
            status: new FormControl('')
        });
    }

    handleSearch(): void {
        this.paginationConfig.currentPage = 0;
        this.dataFormSearch = {
            ...this.formSearch.getRawValue(),
            page: this.paginationConfig.currentPage,
            limit: this.paginationConfig.pageSize
        };
        this.loadProviders();
    }

    handlePageChange(page: number): void {
        this.paginationConfig.currentPage = page;
        this.loadProviders();
    }

    selectPageSize(pageSize: number): void {
        this.paginationConfig.currentPage = 0;
        this.paginationConfig.pageSize = pageSize;
        this.loadProviders();
    }

    clearForm(): void {
        this.formSearch.reset({ name: '', status: '' });
        this.paginationConfig.currentPage = 0;
        this.dataFormSearch = {};
        this.loadProviders();
    }

    private loadProviders(): void {
        this.loading = true;
        const filter: ProviderFilter = {
            name: this.dataFormSearch.name || undefined,
            status: this.dataFormSearch.status ? Number(this.dataFormSearch.status) : undefined,
            page: this.paginationConfig.currentPage,
            limit: this.paginationConfig.pageSize
        };

        this.externalApiService.listProviders(filter).subscribe({
            next: (response: any) => {
                if (response.success && response.data) {
                    this.providers = response.data.content || [];
                    this.paginationConfig = this.paginationService.extractPaginationInfo(response.data);
                }
                this.loading = false;
            },
            error: (error: any) => {
                this.notificationService.error('Lỗi khi tải danh sách providers');
                this.loading = false;
            }
        });
    }

    onCreateClick(): void {
        this.selectedProvider = null;
        this.isCreateMode = true;
        this.showDetailModal = true;
    }

    onEditClick(provider: ExternalApiProvider): void {
        this.selectedProvider = provider;
        this.isCreateMode = false;
        this.showDetailModal = true;
    }

    onDetailModalClose(): void {
        this.showDetailModal = false;
        this.selectedProvider = null;
        this.isCreateMode = false;
    }

    onDetailModalSuccess(): void {
        this.loadProviders();
    }

    async onDeleteClick(id: number): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc muốn xóa provider này?',
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            this.externalApiService.deleteProvider(id).subscribe({
                next: (response: any) => {
                    if (response.success) {
                        this.notificationService.success('Xóa provider thành công');
                        this.loadProviders();
                    }
                },
                error: (error: any) => {
                    this.notificationService.error(error?.error?.message || 'Lỗi khi xóa provider');
                }
            });
        }
    }

    async onTestConnection(provider: ExternalApiProvider): Promise<void> {
        this.externalApiService.testConnection(provider.id!).subscribe({
            next: (response: any) => {
                if (response.success && response.data?.success) {
                    this.balanceByProviderId[provider.id!] = this.formatBalance(response.data.balance);
                    this.notificationService.success(`Kết nối thành công! Balance: ${response.data.balance}`);
                } else {
                    this.notificationService.error(response.data?.message || 'Kết nối thất bại');
                }
            },
            error: (error: any) => {
                this.notificationService.error('Lỗi kết nối đến provider');
            }
        });
    }

    onViewMappings(provider: ExternalApiProvider): void {
        this.router.navigate(['/admin/external-api/mappings'], {
            queryParams: { providerId: provider.id }
        });
    }

    formatBalance(value: any): string {
        if (value === null || value === undefined || value === 'N/A') {
            return 'N/A';
        }
        if (typeof value === 'number') {
            return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
        }
        return String(value);
    }
}
