import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TransactionResponse } from '../../../../core/models/transaction.model';
import { TransactionService } from '../../../../core/services/wallet.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';

interface TransactionSearchFilter {
  transactionCode?: string;
  email?: string;
  status?: number | string;
  type?: number | string;
  pagination?: any;
}

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class TransactionListComponent implements OnInit {
  private readonly transactionService = inject(TransactionService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly paginationService = inject(PaginationService);

  transactions: TransactionResponse[] = [];

  paginationConfig: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };

  dataFormSearch: TransactionSearchFilter = {};
  formSearch!: FormGroup;

  // ========== NOTE MODAL ==========
  showNoteModal = false;
  selectedTransaction: TransactionResponse | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadTransactions();
  }

  private initForm(): void {
    this.formSearch = this.createSearchForm();
  }

  private createSearchForm(): FormGroup {
    return this.fb.group({
      transactionCode: new FormControl(''),
      email: new FormControl(''),
      status: new FormControl(''),
      type: new FormControl(''),
      searchPage: new FormControl('')
    });
  }

  handleSearch(): void {
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadTransactions();
  }

  handleSearchPage(): void {
    const pageNum = this.formSearch.get('searchPage')?.value;
    if (!pageNum) {
      return;
    }

    if (pageNum > this.paginationConfig.totalPages || pageNum < 1) {
      this.notificationService.error(`Trang phải từ 1 đến ${this.paginationConfig.totalPages}`);
    } else {
      this.paginationConfig.currentPage = pageNum - 1;
      this.dataFormSearch = {
        ...this.formSearch.getRawValue(),
        pagination: this.paginationConfig
      };
      this.loadTransactions();
      this.formSearch.get('searchPage')?.reset();
    }
  }

  selectPageSize(pageSize: number): void {
    this.paginationConfig.currentPage = 0;
    this.paginationConfig.pageSize = pageSize;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadTransactions();
  }

  handlePageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadTransactions();
  }

  clearForm(): void {
    this.formSearch = this.createSearchForm();
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {};
    this.loadTransactions();
  }

  private loadTransactions(): void {
    const params: any = {
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize
    };

    if (this.dataFormSearch.transactionCode) {
      params.transactionCode = this.dataFormSearch.transactionCode;
    }
    if (this.dataFormSearch.status !== '' && this.dataFormSearch.status !== undefined) {
      params.status = Number(this.dataFormSearch.status);
    }
    if (this.dataFormSearch.type !== '' && this.dataFormSearch.type !== undefined) {
      params.type = Number(this.dataFormSearch.type);
    }
    if (this.dataFormSearch.email) {
      params.email = this.dataFormSearch.email;
    }

    this.transactionService.adminList(params).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.content) {
          this.transactions = response.data.content;

          // Extract pagination từ backend
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
        console.error('Error loading transactions:', error);
        this.notificationService.error('Lỗi khi tải danh sách giao dịch');
      }
    });
  }

  // ========== HELPER: CHECK IF STATUS IS PENDING ==========
  isPending(status: string | number): boolean {
    const pendingValues = [0, '0', 'PENDING'];
    return pendingValues.includes(status);
  }

  // ========== APPROVE TRANSACTION (PENDING -> SUCCESS) ==========
  async approveTransaction(transaction: TransactionResponse): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Xác nhận duyệt giao dịch',
      message: `Duyệt giao dịch <strong>#${transaction.transactionCode}</strong>?<br><br>Số tiền: <strong>${transaction.amount.toLocaleString()} VNĐ</strong><br><br>Nếu là giao dịch nạp tiền, số dư sẽ được cộng vào ví người dùng.`,
      confirmText: 'Duyệt',
      cancelText: 'Hủy',
      confirmButtonClass: 'btn-success'
    });

    if (confirmed) {
      this.transactionService.updateStatus(transaction.id, 2, 'Admin duyệt giao dịch').subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Duyệt giao dịch thành công');
            this.loadTransactions();
          } else {
            this.notificationService.error(response.message || 'Có lỗi xảy ra');
          }
        },
        error: (error: any) => {
          this.notificationService.error(error.error?.message || 'Có lỗi xảy ra');
        }
      });
    }
  }

  // ========== REJECT TRANSACTION (PENDING -> FAILED) ==========
  async rejectTransaction(transaction: TransactionResponse): Promise<void> {
    const reason = await this.confirmService.prompt({
      title: 'Từ chối giao dịch',
      message: `Từ chối giao dịch <strong>#${transaction.transactionCode}</strong><br>Số tiền: <strong>${transaction.amount.toLocaleString()} VNĐ</strong>`,
      inputLabel: 'Lý do từ chối',
      placeholder: 'Nhập lý do từ chối giao dịch...',
      confirmText: 'Từ chối',
      cancelText: 'Hủy',
      confirmButtonClass: 'btn-danger',
      rows: 2
    });

    if (reason === null) return; // User cancelled

    this.transactionService.updateStatus(transaction.id, 3, reason || 'Admin từ chối giao dịch').subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Từ chối giao dịch thành công');
          this.loadTransactions();
        } else {
          this.notificationService.error(response.message || 'Có lỗi xảy ra');
        }
      },
      error: (error: any) => {
        this.notificationService.error(error.error?.message || 'Có lỗi xảy ra');
      }
    });
  }


  getTypeLabel(type: string | number): string {
    const typeMap: { [key: string]: string } = {
      '0': 'Nạp tiền',
      '2': 'Hoàn tiền',
      '3': 'Admin điều chỉnh',
      'DEPOSIT': 'Nạp tiền',
      'REFUND': 'Hoàn tiền',
      'ADMIN_ADJUST': 'Admin điều chỉnh'
    };
    return typeMap[type?.toString()] || type?.toString() || '';
  }

  getTypeClass(type: string | number): string {
    const classMap: { [key: string]: string } = {
      '0': 'bg-success',
      '2': 'bg-info',
      '3': 'bg-primary',
      'DEPOSIT': 'bg-success',
      'REFUND': 'bg-info',
      'ADMIN_ADJUST': 'bg-primary'
    };
    return classMap[type?.toString()] || 'bg-secondary';
  }

  getStatusLabel(status: string | number): string {
    const statusMap: { [key: string]: string } = {
      '0': 'Chờ xử lý',
      '1': 'Đang xử lý',
      '2': 'Thành công',
      '3': 'Thất bại',
      '4': 'Đã hủy',
      '5': 'Đã hoàn tiền',
      'PENDING': 'Chờ xử lý',
      'PROCESSING': 'Đang xử lý',
      'SUCCESS': 'Thành công',
      'FAILED': 'Thất bại',
      'CANCELLED': 'Đã hủy',
      'REFUNDED': 'Đã hoàn tiền'
    };
    return statusMap[status?.toString()] || status?.toString() || '';
  }

  getStatusClass(status: string | number): string {
    const classMap: { [key: string]: string } = {
      '0': 'bg-warning',
      '1': 'bg-info',
      '2': 'bg-success',
      '3': 'bg-danger',
      '4': 'bg-secondary',
      '5': 'bg-info',
      'PENDING': 'bg-warning',
      'PROCESSING': 'bg-info',
      'SUCCESS': 'bg-success',
      'FAILED': 'bg-danger',
      'CANCELLED': 'bg-secondary',
      'REFUNDED': 'bg-info'
    };
    return classMap[status?.toString()] || 'bg-secondary';
  }

  // ================= NOTE MODAL =================
  hasNote(transaction: TransactionResponse): boolean {
    return !!(transaction.description || transaction.errorMessage);
  }

  isFailed(status: string | number): boolean {
    const failedValues = [3, '3', 'FAILED'];
    return failedValues.includes(status);
  }

  openNoteModal(transaction: TransactionResponse): void {
    this.selectedTransaction = transaction;
    this.showNoteModal = true;
  }

  closeNoteModal(): void {
    this.showNoteModal = false;
    this.selectedTransaction = null;
  }
}
