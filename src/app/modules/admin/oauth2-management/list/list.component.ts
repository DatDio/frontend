import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OAuth2Request, OAuth2RequestFilter, OAuth2RequestStatus } from '../../../../core/models/oauth2-request.model';
import { OAuth2Service } from '../../../../core/services/oauth2.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';

@Component({
    selector: 'app-oauth2-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, PaginationComponent],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss'
})
export class OAuth2ListComponent implements OnInit {
    private readonly oauth2Service = inject(OAuth2Service);
    private readonly notificationService = inject(NotificationService);
    private readonly fb = inject(FormBuilder);
    private readonly paginationService = inject(PaginationService);

    requests: OAuth2Request[] = [];

    paginationConfig: PaginationConfig = {
        currentPage: 0,
        totalPages: 1,
        pageSize: 20,
        totalElements: 0
    };

    formSearch!: FormGroup;
    selectedRequest: OAuth2Request | null = null;
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
        const filter: OAuth2RequestFilter = {
            page: this.paginationConfig.currentPage,
            limit: this.paginationConfig.pageSize,
            requestNumber: this.formSearch.get('requestNumber')?.value || undefined,
            userEmail: this.formSearch.get('userEmail')?.value || undefined,
            status: this.formSearch.get('status')?.value || undefined,
        };

        this.oauth2Service.adminSearch(filter).subscribe({
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

    onViewDetail(request: OAuth2Request): void {
        this.oauth2Service.adminGetById(request.id).subscribe({
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

    getStatusLabel(status: OAuth2RequestStatus): string {
        const statusMap: Record<string, string> = {
            'PENDING': 'Chờ xử lý',
            'PROCESSING': 'Đang xử lý',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy',
            'EXPIRED': 'Hết hạn'
        };
        return statusMap[status] || status;
    }

    getStatusClass(status: OAuth2RequestStatus): string {
        const classMap: Record<string, string> = {
            'PENDING': 'badge-warning',
            'PROCESSING': 'badge-info',
            'COMPLETED': 'badge-success',
            'CANCELLED': 'badge-danger',
            'EXPIRED': 'badge-secondary'
        };
        return classMap[status] || 'badge-secondary';
    }

    copyResults(request: OAuth2Request): void {
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

    copyFailedResults(request: OAuth2Request): void {
        if (!request.results?.length) return;
        const failedResults = request.results
            .filter(r => r.status === 'FAILED')
            .map(r => r.inputLine)
            .join('\n');

        if (failedResults) {
            navigator.clipboard.writeText(failedResults);
            this.notificationService.success('Đã copy danh sách thất bại');
        } else {
            this.notificationService.warning('Không có kết quả thất bại để copy');
        }
    }
}
