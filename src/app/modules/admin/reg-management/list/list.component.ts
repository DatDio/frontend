import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RegRequest, RegRequestFilter, RegRequestStatus } from '../../../../core/models/reg-request.model';
import { RegService } from '../../../../core/services/reg.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';

@Component({
    selector: 'app-reg-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, PaginationComponent],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss'
})
export class RegListComponent implements OnInit {
    private readonly regService = inject(RegService);
    private readonly notificationService = inject(NotificationService);
    private readonly confirmService = inject(ConfirmService);
    private readonly fb = inject(FormBuilder);
    private readonly paginationService = inject(PaginationService);

    requests: RegRequest[] = [];

    paginationConfig: PaginationConfig = {
        currentPage: 0,
        totalPages: 1,
        pageSize: 20,
        totalElements: 0
    };

    formSearch!: FormGroup;
    selectedRequest: RegRequest | null = null;
    showDetailModal = false;

    ngOnInit(): void {
        this.initForm();
        this.loadRequests();
    }

    private initForm(): void {
        this.formSearch = this.fb.group({
            requestNumber: new FormControl(''),
            userEmail: new FormControl(''),
            status: new FormControl(''),
            searchPage: new FormControl('')
        });
    }

    handleSearch(): void {
        this.paginationConfig.currentPage = 0;
        this.loadRequests();
    }

    handlePageChange(page: number): void {
        this.paginationConfig.currentPage = page;
        this.loadRequests();
    }

    selectPageSize(pageSize: number): void {
        this.paginationConfig.currentPage = 0;
        this.paginationConfig.pageSize = pageSize;
        this.loadRequests();
    }

    clearForm(): void {
        this.initForm();
        this.paginationConfig.currentPage = 0;
        this.loadRequests();
    }

    private loadRequests(): void {
        const filter: RegRequestFilter = {
            page: this.paginationConfig.currentPage,
            limit: this.paginationConfig.pageSize,
            requestNumber: this.formSearch.get('requestNumber')?.value || undefined,
            userEmail: this.formSearch.get('userEmail')?.value || undefined,
            status: this.formSearch.get('status')?.value || undefined,
        };

        this.regService.adminSearch(filter).subscribe({
            next: (response: any) => {
                if (response.success && response.data?.content) {
                    this.requests = response.data.content;
                    const paginationInfo = this.paginationService.extractPaginationInfo(response.data);
                    this.paginationConfig = {
                        currentPage: paginationInfo.currentPage,
                        pageSize: paginationInfo.pageSize,
                        totalElements: paginationInfo.totalElements,
                        totalPages: paginationInfo.totalPages
                    };
                }
            },
            error: (error: any) => {
                this.notificationService.error('Lỗi khi tải danh sách yêu cầu');
            }
        });
    }

    onViewDetail(request: RegRequest): void {
        this.regService.adminGetById(request.id).subscribe({
            next: (response: any) => {
                if (response.success) {
                    this.selectedRequest = response.data;
                    this.showDetailModal = true;
                }
            },
            error: () => this.notificationService.error('Lỗi khi tải chi tiết yêu cầu')
        });
    }

    onCloseModal(): void {
        this.showDetailModal = false;
        this.selectedRequest = null;
    }

    async onCleanup(): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận',
            message: 'Dọn dẹp các yêu cầu đã hết hạn?',
            confirmText: 'Dọn dẹp',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            this.regService.adminCleanup().subscribe({
                next: () => {
                    this.notificationService.success('Đã dọn dẹp thành công');
                    this.loadRequests();
                },
                error: () => this.notificationService.error('Lỗi khi dọn dẹp')
            });
        }
    }

    async onResetStuck(): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận',
            message: 'Reset các yêu cầu bị stuck (PROCESSING quá lâu)?',
            confirmText: 'Reset',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            this.regService.adminResetStuck().subscribe({
                next: () => {
                    this.notificationService.success('Đã reset thành công');
                    this.loadRequests();
                },
                error: () => this.notificationService.error('Lỗi khi reset')
            });
        }
    }

    getStatusLabel(status: RegRequestStatus): string {
        const statusMap: Record<string, string> = {
            'PENDING': 'Chờ xử lý',
            'PROCESSING': 'Đang xử lý',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy',
            'EXPIRED': 'Hết hạn'
        };
        return statusMap[status] || status;
    }

    getStatusClass(status: RegRequestStatus): string {
        const classMap: Record<string, string> = {
            'PENDING': 'badge-warning',
            'PROCESSING': 'badge-info',
            'COMPLETED': 'badge-success',
            'CANCELLED': 'badge-danger',
            'EXPIRED': 'badge-secondary'
        };
        return classMap[status] || 'badge-secondary';
    }

    copyResults(request: RegRequest): void {
        if (!request.results?.length) return;
        const successResults = request.results
            .filter(r => r.status === 'SUCCESS' && r.accountData)
            .map(r => r.accountData)
            .join('\n');

        if (successResults) {
            navigator.clipboard.writeText(successResults);
            this.notificationService.success('Đã copy kết quả thành công');
        } else {
            this.notificationService.warning('Không có kết quả thành công để copy');
        }
    }
}
