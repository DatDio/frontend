import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RankService } from '../../../../core/services/rank.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { Rank } from '../../../../core/models/rank.model';
import { RankModalComponent } from '../rank-modal/rank-modal.component';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { ActiveStatusSelectComponent } from '../../../../shared/components/active-status-select/active-status-select.component';
import { ActiveStatusBadgeComponent } from '../../../../shared/components/active-status-badge/active-status-badge.component';

@Component({
    selector: 'app-rank-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RankModalComponent,
        PaginationComponent,
        ActiveStatusSelectComponent,
        ActiveStatusBadgeComponent
    ],
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss']
})
export class RankListComponent implements OnInit {
    readonly #rankService = inject(RankService);
    readonly #notificationService = inject(NotificationService);
    readonly #confirmService = inject(ConfirmService);
    readonly #fb = inject(FormBuilder);
    readonly #paginationService = inject(PaginationService);

    ranks: Rank[] = [];
    loading = true;
    showModal = false;
    modalMode: 'create' | 'update' = 'create';
    selectedRank: Rank | null = null;
    searchForm!: FormGroup;

    paginationConfig: PaginationConfig = {
        currentPage: 0,
        totalPages: 1,
        pageSize: 10,
        totalElements: 0
    };

    ngOnInit(): void {
        this.initSearchForm();
        this.loadRanks();
    }

    private initSearchForm(): void {
        this.searchForm = this.#fb.group({
            name: [''],
            status: ['']
        });
    }

    loadRanks(): void {
        this.loading = true;
        const filter = {
            name: this.searchForm.get('name')?.value || undefined,
            status: this.searchForm.get('status')?.value || undefined,
            page: this.paginationConfig.currentPage,
            limit: this.paginationConfig.pageSize
        };

        this.#rankService.list(filter).subscribe({
            next: (response) => {
                if (response.success) {
                    this.ranks = response.data.content || [];
                    this.paginationConfig = this.#paginationService.extractPaginationInfo(response.data);
                } else {
                    this.#notificationService.error(response.message || 'Có lỗi xảy ra khi tải thứ hạng');
                }
                this.loading = false;
            },
            error: (error) => {
                this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra khi tải thứ hạng');
                this.loading = false;
            }
        });
    }

    openCreateModal(): void {
        this.modalMode = 'create';
        this.selectedRank = null;
        this.showModal = true;
    }

    openUpdateModal(rank: Rank): void {
        this.modalMode = 'update';
        this.selectedRank = rank;
        this.showModal = true;
    }

    onModalClose(result: Rank | null): void {
        this.showModal = false;
        if (result) {
            this.loadRanks();
        }
    }

    async deleteRank(id: number): Promise<void> {
        const confirmed = await this.#confirmService.confirm({
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc muốn xóa thứ hạng này?',
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            this.#rankService.delete(id).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.#notificationService.success('Xóa thứ hạng thành công');
                        this.loadRanks();
                    } else {
                        this.#notificationService.error(response.message || 'Xóa thứ hạng thất bại');
                    }
                },
                error: (error) => {
                    this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
                }
            });
        }
    }

    handleSearch(): void {
        this.paginationConfig.currentPage = 0;
        this.loadRanks();
    }

    clearForm(): void {
        this.searchForm.reset();
        this.paginationConfig.currentPage = 0;
        this.loadRanks();
    }

    handlePageChange(page: number): void {
        this.paginationConfig.currentPage = page;
        this.loadRanks();
    }

    selectPageSize(pageSize: number): void {
        this.paginationConfig.pageSize = pageSize;
        this.paginationConfig.currentPage = 0;
        this.loadRanks();
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN').format(value);
    }
}
