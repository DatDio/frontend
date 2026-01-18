import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
import { VndUsdPipe } from '../../../../shared/pipes/vnd-usd.pipe';
import { CurrencyService } from '../../../../core/services/currency.service';
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
    PaginationComponent,
    TranslateModule,
    VndUsdPipe
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
  private readonly translate = inject(TranslateService);
  private readonly currencyService = inject(CurrencyService);

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
  depositMethod: 'vietqr' | 'crypto' = 'vietqr';
  depositAmount: number = 10000;
  depositAmountDisplay: string = '10,000';

  // ========== CRYPTO DEPOSIT ==========
  cryptoAmount: number = 1;
  cryptoAmountDisplay: string = '1';
  usdVndRate: number = 26000; // Tỷ giá mặc định 1 USDT = 26,000 VND
  estimatedVnd: number = 26000; // Default: 1 USDT * 26000

  // ========== WEB2M QR MODAL ==========
  showQrModal = false;
  qrCodeUrl = '';
  transferContent = '';
  bankName = '';
  accountNumber = '';
  accountName = '';
  currentTransactionCode = 0;

  // ========== CRYPTO MODAL ==========
  showCryptoModal = false;
  cryptoPaymentUrl = '';
  cryptoTransId = '';

  // ========== RANK INFO ==========
  userRankInfo: UserRankInfo | null = null;
  ctvBonusPercent: number = 0;
  isCollaborator: boolean = false;

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
    this.loadUsdVndRate();
    this.depositAmountDisplay = this.formatNumber(this.depositAmount);
    // Initialize estimatedVnd for default crypto amount
    this.estimatedVnd = this.calculateEstimatedVnd();

    // Subscribe to deposit success events to close modal and reload data
    this.depositSuccessSub = this.depositNotificationService.depositSuccess$.subscribe(() => {
      this.showQrModal = false;
      this.showCryptoModal = false;
      this.loadTransactions();
    });
  }

  ngOnDestroy(): void {
    this.depositSuccessSub?.unsubscribe();
  }

  // Load user rank info (includes CTV info from API - realtime)
  private loadRankInfo(): void {
    this.rankService.getMyRank().subscribe({
      next: (res) => {
        if (res.success) {
          this.userRankInfo = res.data;
          // CTV info from API (realtime, not from localStorage)
          this.isCollaborator = res.data.isCollaborator ?? false;
          this.ctvBonusPercent = res.data.ctvBonusPercent ?? 0;
        }
      },
      error: (err) => {
      }
    });
  }

  // Load USD/VND exchange rate from CurrencyService
  private loadUsdVndRate(): void {
    // Get current rate immediately
    this.usdVndRate = this.currencyService.getRate();
    this.estimatedVnd = this.calculateEstimatedVnd();

    // Subscribe to rate changes
    this.currencyService.usdVndRate$.subscribe(rate => {
      this.usdVndRate = rate;
      this.estimatedVnd = this.calculateEstimatedVnd();
    });
  }

  // Handle crypto (USDT) amount input change
  onCryptoAmountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Allow decimal input for USDT, max 2 decimal places
    let rawValue = input.value.replace(/[^0-9.]/g, '');

    // Handle multiple dots - keep only first one
    const dotIndex = rawValue.indexOf('.');
    if (dotIndex !== -1) {
      rawValue = rawValue.slice(0, dotIndex + 1) + rawValue.slice(dotIndex + 1).replace(/\./g, '');
    }

    // Limit to 2 decimal places
    if (dotIndex !== -1 && rawValue.length > dotIndex + 3) {
      rawValue = rawValue.slice(0, dotIndex + 3);
    }

    if (rawValue) {
      this.cryptoAmount = parseFloat(rawValue);
      this.cryptoAmountDisplay = rawValue;
      this.estimatedVnd = this.calculateEstimatedVnd();
    } else {
      this.cryptoAmount = 0;
      this.cryptoAmountDisplay = '';
      this.estimatedVnd = 0;
    }

    // Update input value with formatted display
    input.value = this.cryptoAmountDisplay;
  }

  // Calculate estimated VND from USDT amount
  calculateEstimatedVnd(): number {
    if (!this.cryptoAmount || this.cryptoAmount <= 0) return 0;
    return Math.floor(this.cryptoAmount * this.usdVndRate);
  }

  // Calculate bonus for crypto deposit (based on VND equivalent)
  calculateCryptoBonus(): number {
    const rankBonus = this.userRankInfo?.bonusPercent ?? 0;
    const totalBonusPercent = rankBonus + this.ctvBonusPercent;
    if (totalBonusPercent <= 0) return 0;
    return Math.floor((this.estimatedVnd * totalBonusPercent) / 100);
  }

  // Calculate total for crypto deposit
  calculateCryptoTotal(): number {
    return this.estimatedVnd + this.calculateCryptoBonus();
  }

  // Calculate bonus amount based on deposit (Rank bonus + CTV bonus)
  calculateBonus(): number {
    const rankBonus = this.userRankInfo?.bonusPercent ?? 0;
    const totalBonusPercent = rankBonus + this.ctvBonusPercent;
    if (totalBonusPercent <= 0) return 0;
    return Math.floor((this.depositAmount * totalBonusPercent) / 100);
  }

  // Get total bonus percent (Rank + CTV)
  getTotalBonusPercent(): number {
    return (this.userRankInfo?.bonusPercent ?? 0) + this.ctvBonusPercent;
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
      this.notificationService.error(this.translate.instant('MESSAGE.MIN_DEPOSIT_ERROR'));
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
          this.notificationService.error(this.translate.instant('MESSAGE.QR_CREATE_ERROR'));
        }
      },
      error: (error: any) => {
        this.notificationService.error(
          error.error?.message || this.translate.instant('MESSAGE.REQ_ERROR')
        );
      }
    });
  }

  // ================== CREATE DEPOSIT CRYPTO (FPAYMENT) ==================
  createDepositCrypto(): void {
    // Validate minimum USDT amount (1 USDT)
    if (!this.cryptoAmount || this.cryptoAmount < 1) {
      this.notificationService.error(this.translate.instant('TRANSACTION.MIN_USDT_ERROR'));
      return;
    }

    // Open blank window BEFORE async call to avoid popup blocker
    const paymentWindow = window.open('about:blank', '_blank');

    // Send USDT amount directly to backend
    this.transactionService.createDepositFPayment(this.cryptoAmount).subscribe({
      next: (res: any) => {
        if (res.success && res.data?.urlPayment) {
          // Start listening for deposit notification
          this.currentTransactionCode = res.data.transactionCode;
          this.depositNotificationService.startListening(this.currentTransactionCode);
          this.loadTransactions();
          // Navigate the pre-opened window to payment URL
          if (paymentWindow) {
            paymentWindow.location.href = res.data.urlPayment;
          } else {
            // Fallback: navigate current tab if popup was blocked
            window.location.href = res.data.urlPayment;
          }

          // Show notification
          this.notificationService.success(this.translate.instant('TRANSACTION.PAYMENT_CREATED'));
          // Backend will poll FPayment status and notify via WebSocket when completed
        } else {
          // Close the blank window if request failed
          paymentWindow?.close();
          this.notificationService.error(this.translate.instant('TRANSACTION.CRYPTO_CREATE_ERROR'));
        }
      },
      error: (error: any) => {
        // Close the blank window on error
        paymentWindow?.close();
        this.notificationService.error(
          error.error?.message || this.translate.instant('TRANSACTION.CRYPTO_ERROR')
        );
      }
    });
  }

  // Open crypto payment page in new tab
  openCryptoPayment(): void {
    if (this.cryptoPaymentUrl) {
      window.open(this.cryptoPaymentUrl, '_blank');
    }
  }

  // ================== CRYPTO MODAL ACTIONS ==================
  closeCryptoModal(): void {
    this.showCryptoModal = false;
    this.loadTransactions();
    this.transactionService.refreshBalance();
  }

  // ================== QR MODAL ACTIONS ==================
  closeQrModal(): void {
    this.showQrModal = false;
    this.loadTransactions();
    this.transactionService.refreshBalance();
  }

  copyTransferContent(): void {
    navigator.clipboard.writeText(this.transferContent).then(() => {
      this.notificationService.success(this.translate.instant('MESSAGE.COPIED_CONTENT'));
    }).catch(() => {
      this.notificationService.error(this.translate.instant('MESSAGE.MANUAL_COPY'));
    });
  }

  copyAccountNumber(): void {
    navigator.clipboard.writeText(this.accountNumber).then(() => {
      this.notificationService.success(this.translate.instant('MESSAGE.COPIED_ACCOUNT'));
    }).catch(() => {
      this.notificationService.error(this.translate.instant('MESSAGE.MANUAL_COPY'));
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
      this.notificationService.error(
        this.translate.instant('MESSAGE.PAGE_RANGE_ERROR', { max: this.paginationConfig.totalPages })
      );
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
          this.notificationService.error(response.message || this.translate.instant('MESSAGE.ERROR'));
        }

        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || this.translate.instant('MESSAGE.ERROR'));
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
      REFUND: 'badge-success',
      ADMIN_ADJUST: 'badge-info',
      REG_PAYMENT: 'badge-info',
      REG_REFUND: 'badge-success',
      REG_CANCEL_REFUND: 'badge-success'
    };
    return map[type] || 'badge-secondary';
  }

  getAmountClass(type: string): string {
    const debitTypes = ['PURCHASE', 'REG_PAYMENT'];
    const creditTypes = ['DEPOSIT', 'REFUND', 'REG_REFUND', 'REG_CANCEL_REFUND', 'ADMIN_ADJUST'];
    if (debitTypes.includes(type)) return 'text-danger';
    if (creditTypes.includes(type)) return 'text-success';
    return '';
  }

  getAmountPrefix(type: string): string {
    const debitTypes = ['PURCHASE', 'REG_PAYMENT'];
    const creditTypes = ['DEPOSIT', 'REFUND', 'REG_REFUND', 'REG_CANCEL_REFUND'];
    if (debitTypes.includes(type)) return '-';
    if (creditTypes.includes(type)) return '+';
    return '';
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
