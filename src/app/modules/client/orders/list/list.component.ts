import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Order, OrderFilter } from '../../../../core/models/order.model';
import { OrderService } from '../../../../core/services/order.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SeoService } from '../../../../core/services/seo.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';

interface OrderSearchFilter extends OrderFilter {
  pagination?: PaginationConfig;
}

@Component({
  selector: 'app-client-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, PaginationComponent, TranslateModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ClientOrderListComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly paginationService = inject(PaginationService);
  private readonly seoService = inject(SeoService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  orders: Order[] = [];
  loading = true;
  formSearch!: FormGroup;
  dataFormSearch: OrderSearchFilter = {};

  // Tracking copy state
  copiedOrderId: number | null = null;
  private copyTimeout: any;

  paginationConfig: PaginationConfig = {
    currentPage: 0,
    pageSize: 10,
    totalPages: 1,
    totalElements: 0
  };

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Quản Lý Đơn Hàng - EmailSieuRe',
      'Xem và quản lý tất cả đơn hàng của bạn. Theo dõi trạng thái đơn hàng, tải xuống tài khoản đã mua.',
      'đơn hàng, quản lý đơn hàng, order management, EmailSieuRe'
    );
    this.initForm();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }

  private initForm(): void {
    this.formSearch = this.fb.group({
      orderNumber: new FormControl(''),
      orderStatus: new FormControl(''),
      searchPage: new FormControl('')
    });
  }

  private loadOrders(): void {
    this.loading = true;

    const params: any = {
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize,
      sort: 'id,desc'
    };

    if (this.dataFormSearch.orderNumber) {
      params.orderNumber = this.dataFormSearch.orderNumber;
    }

    if (this.dataFormSearch.orderStatus) {
      params.orderStatus = this.dataFormSearch.orderStatus;
    }

    this.orderService.searchMyOrders(params).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.orders = response.data?.content || [];

          const paginationInfo = this.paginationService.extractPaginationInfo(response.data);
          this.paginationConfig = {
            currentPage: paginationInfo.currentPage,
            pageSize: paginationInfo.pageSize,
            totalElements: paginationInfo.totalElements,
            totalPages: paginationInfo.totalPages
          };
        } else {
          this.orders = [];
          this.paginationConfig = {
            ...this.paginationConfig,
            totalElements: 0,
            totalPages: 1,
            currentPage: 0
          };
          this.notificationService.error(response.message || this.translate.instant('MESSAGE.ERROR'));
        }

        this.loading = false;
      },
      error: (error: any) => {
        this.loading = false;
        console.error(error);
        this.notificationService.error(error.error?.message || this.translate.instant('MESSAGE.ERROR'));
      }
    });
  }

  handleSearch(): void {
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadOrders();
  }

  handlePageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadOrders();
  }

  selectPageSize(pageSize: number): void {
    this.paginationConfig.pageSize = pageSize;
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadOrders();
  }

  clearForm(): void {
    this.formSearch.reset();
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {};
    this.loadOrders();
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
      this.loadOrders();
      this.formSearch.get('searchPage')?.reset();
    }
  }

  /**
   * Copy accounts voi hieu ung "Da copy"
   */
  copyAccounts(order: Order): void {
    if (!order.accountData || order.accountData.length === 0) {
      this.notificationService.warning(this.translate.instant('MESSAGE.NO_ACCOUNT_TO_COPY'));
      return;
    }

    const content = order.accountData.join('\n');

    navigator.clipboard.writeText(content).then(() => {
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }

      this.copiedOrderId = order.id;
      this.notificationService.success(this.translate.instant('MESSAGE.ACCOUNTS_COPIED'));

      this.copyTimeout = setTimeout(() => {
        this.copiedOrderId = null;
      }, 2000);
    }).catch(err => {
      this.notificationService.error(this.translate.instant('MESSAGE.COPY_FAILED'));
    });
  }

  /**
   * Download accounts as txt file
   */
  downloadAccounts(order: Order): void {
    if (!order.accountData || order.accountData.length === 0) {
      this.notificationService.warning(this.translate.instant('MESSAGE.NO_ACCOUNT_TO_DOWNLOAD'));
      return;
    }

    const content = order.accountData.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.orderNumber}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.notificationService.success(this.translate.instant('MESSAGE.DOWNLOAD_SUCCESS'));
  }

  /**
   * Get label hien thi cho trang thai
   */
  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'Chờ xử lý',
      'PROCESSING': 'Đang xử lý',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy',
      'REFUNDED': 'Hoàn tiền'
    };
    return statusMap[status?.toUpperCase()] || status;
  }

  /**
   * Get class CSS cho badge trang thai
   */
  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'PENDING': 'badge-warning',
      'PROCESSING': 'badge-info',
      'COMPLETED': 'badge-success',
      'CANCELLED': 'badge-danger',
      'REFUNDED': 'badge-secondary'
    };
    return classMap[status?.toUpperCase()] || 'badge-secondary';
  }
}
