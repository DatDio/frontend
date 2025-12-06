import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TransactionFilter, TransactionResponse } from '../../../../core/models/transaction.model';
import { TransactionService } from '../../../../core/services/wallet.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { convertToISO } from '../../../../Utils/functions/date-time-utils';
import { environment } from '../../../../../environments/environment';

declare global {
  interface Window {
    PayOSCheckout: any;
  }
}

@Component({
  selector: 'app-client-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent
  ],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ClientTransactionListComponent implements OnInit {

  private readonly transactionService = inject(TransactionService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly paginationService = inject(PaginationService);

  transactions: TransactionResponse[] = [];
  loading = true;

  paginationConfig: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };

  dataFormSearch: TransactionFilter = {};
  formSearch!: FormGroup;

  // ========== DEPOSIT ==========
  depositAmount: number = 10000;
  depositAmountDisplay: string = '10,000';

  ngOnInit(): void {
    this.initForm();
    this.loadTransactions();
    this.depositAmountDisplay = this.formatNumber(this.depositAmount);
  }

  // Format number with thousand separators
  private formatNumber(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Handle deposit amount input change
  onDepositAmountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remove all non-digit characters
    const rawValue = input.value.replace(/[^0-9]/g, '');

    if (rawValue) {
      this.depositAmount = parseInt(rawValue, 10);
      this.depositAmountDisplay = this.formatNumber(this.depositAmount);
    } else {
      this.depositAmount = 0;
      this.depositAmountDisplay = '';
    }

    // Update input value with formatted display
    input.value = this.depositAmountDisplay;
  }

  private initForm(): void {
    this.formSearch = this.fb.group({
      transactionCode: new FormControl(''),
      status: new FormControl(''),
      dateFrom: new FormControl(''),
      dateTo: new FormControl(''),
      searchPage: new FormControl('')
    });
  }

  // ================== CREATE DEPOSIT ==================
  createDeposit(): void {
    if (!this.depositAmount || this.depositAmount < 10000) {
      this.notificationService.error('Số tiền tối thiểu là 10.000đ');
      return;
    }

    this.transactionService.createDeposit(this.depositAmount).subscribe({
      next: (res: any) => {

        if (res.success && res.data?.checkoutUrl) {
          this.openPayOSPopup(res.data.checkoutUrl);
        } else {
          this.notificationService.error('Không thể tạo giao dịch PayOS');
        }
      },
      error: (error) => {
        this.notificationService.error(
          error.error?.message || 'Lỗi khi tạo yêu cầu thanh toán'
        );
      }
    });

    this.transactionService.refreshBalance();
    this.loadTransactions();
  }

  // ================== PAYOS POPUP ==================
  private openPayOSPopup(checkoutUrl: string): void {
    if (!window.PayOSCheckout) {
      this.notificationService.error('Có lỗi xảy ra. Vui lòng tải lại trang.');
      return;
    }

    let exitFn: any;

    const payOSConfig = {
      RETURN_URL: environment.payOSReturnUrl,
      ELEMENT_ID: 'payos-modal',
      CHECKOUT_URL: checkoutUrl,
      embedded: false,

      onSuccess: () => {
        setTimeout(() => {
          if (exitFn) exitFn();
        }, 10);
      },

      onCancel: () => {
        setTimeout(() => {
          if (exitFn) exitFn();
        }, 10);
      },

      // ❌ KHÔNG GỌI exit() ở đây nữa
      onExit: () => {
        console.log("Popup closed");
      }
    };

    const { open, exit } = window.PayOSCheckout.usePayOS(payOSConfig);
    exitFn = exit;

    open();
  }

  // ================= SEARCH =================
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
    if (!pageNum) return;

    if (pageNum > this.paginationConfig.totalPages || pageNum < 1) {
      this.notificationService.error(`Page must be between 1 and ${this.paginationConfig.totalPages}`);
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
    this.formSearch.reset();
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {};
    this.loadTransactions();
  }

  // ================= LOAD DATA =================
  private loadTransactions(): void {
    this.loading = true;

    const raw = this.dataFormSearch;

    const params: any = {
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize
    };

    if (raw.transactionCode) params.transactionCode = raw.transactionCode;
    if (raw.status) params.status = raw.status;
    if (raw.dateFrom) params.dateFrom = convertToISO(raw.dateFrom);
    if (raw.dateTo) params.dateTo = convertToISO(raw.dateTo);

    this.transactionService.list(params).subscribe({
      next: (response) => {
        if (response.success) {

          this.transactions = response.data.content;

          const p = this.paginationService.extractPaginationInfo(response.data);

          this.paginationConfig = {
            currentPage: p.currentPage,
            pageSize: p.pageSize,
            totalElements: p.totalElements,
            totalPages: p.totalPages
          };
        } else {
          this.notificationService.error(response.message || 'Có lỗi xảy ra');
        }

        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Có lỗi xảy ra');
        this.loading = false;
      }
    });
  }

  deleteTransaction(id: number): void {
    this.transactionService.delete(id).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadTransactions();
        }
      },
    });
  }
  // ================= UI HELPERS =================
  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      DEPOSIT: 'Nạp tiền',
      PURCHASE: 'Mua tài khoản',
      REFUND: 'Hoàn tiền',
      ADMIN_ADJUST: 'Admin điều chỉnh',
    };
    return map[type] || type;
  }

  getTypeClass(type: string): string {
    const map: Record<string, string> = {
      DEPOSIT: 'badge-success',
      PURCHASE: 'badge-warning',
      REFUND: 'badge-danger',
      ADMIN_ADJUST: 'badge-info'
    };
    return map[type] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Chờ xử lý',
      SUCCESS: 'Hoàn thành',
      FAILED: 'Thất bại',
      CANCELLED: 'Hủy',
      REFUNDED: 'Đã hoàn tiền'
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-warning',
      completed: 'badge-success',
      failed: 'badge-danger',
      cancelled: 'badge-secondary'
    };
    return map[status] || 'badge-secondary';
  }

  getAmountColor(type: string): string {
    return type === 'PURCHASE' ? 'text-danger' : 'text-success';
  }
}
