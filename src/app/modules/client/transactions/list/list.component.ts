import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TransactionFilter, TransactionResponse } from '../../../../core/models/transaction.model';
import { TransactionService } from '../../../../core/services/wallet.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SeoService } from '../../../../core/services/seo.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { convertToISO } from '../../../../Utils/functions/date-time-utils';
import { RankService } from '../../../../core/services/rank.service';
import { UserRankInfo } from '../../../../core/models/rank.model';
import { DepositNotificationService } from '../../../../core/services/deposit-notification.service';
import { Subscription } from 'rxjs';

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
  styleUrls: ['./list.component.scss']
})
export class ClientTransactionListComponent implements OnInit, OnDestroy {

  private readonly transactionService = inject(TransactionService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly paginationService = inject(PaginationService);
  private readonly rankService = inject(RankService);
  private readonly seoService = inject(SeoService);
  private readonly depositNotificationService = inject(DepositNotificationService);

  transactions: TransactionResponse[] = [];
  orderCode: number = 0;
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

  // ========== WEB2M QR MODAL ==========
  showQrModal = false;
  qrCodeUrl = '';
  transferContent = '';
  bankName = '';
  accountNumber = '';
  accountName = '';
  currentTransactionCode = 0;

  // ========== RANK INFO ==========
  userRankInfo: UserRankInfo | null = null;

  // ========== NOTE MODAL ==========
  showNoteModal = false;
  selectedTransaction: TransactionResponse | null = null;

  // Subscription for deposit success
  private depositSuccessSub?: Subscription;

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Lịch Sử Giao Dịch - EmailSieuRe',
      'Xem lịch sử giao dịch, nạp tiền và quản lý số dư tài khoản của bạn trên EmailSieuRe.',
      'lịch sử giao dịch, nạp tiền, transaction history, EmailSieuRe'
    );
    this.initForm();
    this.loadTransactions();
    this.loadRankInfo();
    this.depositAmountDisplay = this.formatNumber(this.depositAmount);

    // Subscribe to deposit success events to close modal and reload data
    this.depositSuccessSub = this.depositNotificationService.depositSuccess$.subscribe(() => {
      this.showQrModal = false;
      this.loadTransactions();
    });
  }

  ngOnDestroy(): void {
    this.depositSuccessSub?.unsubscribe();
  }

  // Load user rank info
  private loadRankInfo(): void {
    this.rankService.getMyRank().subscribe({
      next: (res) => {
        if (res.success) {
          this.userRankInfo = res.data;
        }
      },
      error: (err) => {
      }
    });
  }

  // Calculate bonus amount based on deposit
  calculateBonus(): number {
    if (!this.userRankInfo || !this.userRankInfo.bonusPercent) return 0;
    return Math.floor((this.depositAmount * this.userRankInfo.bonusPercent) / 100);
  }

  // Calculate total amount (deposit + bonus)
  calculateTotal(): number {
    return this.depositAmount + this.calculateBonus();
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

  // ================== CREATE DEPOSIT (WEB2M) ==================
  createDeposit(): void {
    if (!this.depositAmount || this.depositAmount < 10000) {
      this.notificationService.error('Số tiền tối thiểu là 10.000đ');
      return;
    }

    this.transactionService.createDepositCasso(this.depositAmount).subscribe({
      next: (res: any) => {
        if (res.success && res.data?.qrCodeUrl) {
          // Show QR Modal
          this.qrCodeUrl = res.data.qrCodeUrl;
          this.transferContent = res.data.transferContent;
          this.bankName = res.data.bankName;
          this.accountNumber = res.data.accountNumber;
          this.accountName = res.data.accountName;
          this.currentTransactionCode = res.data.transactionCode;
          this.showQrModal = true;

          // Start listening for deposit notification via global service
          // This persists across page navigations with 10-minute timeout
          this.depositNotificationService.startListening(this.currentTransactionCode);
        } else {
          this.notificationService.error('Không thể tạo mã QR thanh toán');
        }
      },
      error: (error: any) => {
        this.notificationService.error(
          error.error?.message || 'Lỗi khi tạo yêu cầu thanh toán'
        );
      }
    });
  }



  // ================== QR MODAL ACTIONS ==================
  closeQrModal(): void {
    this.showQrModal = false;
    this.loadTransactions();
    this.transactionService.refreshBalance();
  }

  copyTransferContent(): void {
    navigator.clipboard.writeText(this.transferContent).then(() => {
      this.notificationService.success('Đã sao chép nội dung chuyển khoản!');
    }).catch(() => {
      this.notificationService.error('Không thể sao chép. Vui lòng copy thủ công.');
    });
  }

  copyAccountNumber(): void {
    navigator.clipboard.writeText(this.accountNumber).then(() => {
      this.notificationService.success('Đã sao chép số tài khoản!');
    }).catch(() => {
      this.notificationService.error('Không thể sao chép. Vui lòng copy thủ công.');
    });
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
      PENDING: 'badge-warning',
      SUCCESS: 'badge-success',
      FAILED: 'badge-danger',
      CANCELLED: 'badge-secondary'
    };
    return map[status] || 'badge-secondary';
  }

  // ================= NOTE MODAL =================
  hasNote(transaction: TransactionResponse): boolean {
    return !!(transaction.description || transaction.errorMessage);
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
