import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { Order, OrderCleanupStatus } from '../../../../core/models/order.model';
import { OrderService } from '../../../../core/services/order.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { OrderDetailModalComponent } from '../order-detail-modal/order-detail-modal.component';

interface OrderSearchFilter {
  orderNumber?: string;
  userEmail?: string;
  orderStatus?: string;
  pagination?: any;
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, PaginationComponent, OrderDetailModalComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class OrderListComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly paginationService = inject(PaginationService);

  orders: Order[] = [];

  paginationConfig: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };

  dataFormSearch: OrderSearchFilter = {};
  formSearch!: FormGroup;

  selectedOrderId: number | null = null;
  showDetailModal = false;
  isCleaningExpiredOrders = false;
  private cleanupStatusPollingSub: Subscription | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadOrders();
    this.loadCleanupStatus(false);
  }

  ngOnDestroy(): void {
    this.stopCleanupStatusPolling();
  }

  private initForm(): void {
    this.formSearch = this.createSearchForm();
  }

  private createSearchForm(): FormGroup {
    return this.fb.group({
      orderNumber: new FormControl(''),
      userEmail: new FormControl(''),
      orderStatus: new FormControl(''),
      searchPage: new FormControl('')
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

  handleSearchPage(): void {
    const pageNum = this.formSearch.get('searchPage')?.value;
    if (!pageNum) {
      return;
    }

    if (pageNum > this.paginationConfig.totalPages || pageNum < 1) {
      this.notificationService.error(`Page must be between 1 and ${this.paginationConfig.totalPages}`);
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

  selectPageSize(pageSize: number): void {
    this.paginationConfig.currentPage = 0;
    this.paginationConfig.pageSize = pageSize;
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

  clearForm(): void {
    this.formSearch = this.createSearchForm();
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {};
    this.loadOrders();
  }

  private loadOrders(): void {
    const params: any = {
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize,
      sort: 'id,desc'
    };

    if (this.dataFormSearch.orderNumber) {
      params.orderNumber = this.dataFormSearch.orderNumber;
    }
    if (this.dataFormSearch.userEmail) {
      params.userEmail = this.dataFormSearch.userEmail;
    }
    if (this.dataFormSearch.orderStatus) {
      params.orderStatus = this.dataFormSearch.orderStatus;
    }

    this.orderService.list(params).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.content) {
          this.orders = response.data.content;

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
        console.error('Error loading orders:', error);
        this.notificationService.error('Lỗi khi tải danh sách đơn hàng');
      }
    });
  }

  onViewDetail(order: Order): void {
    this.selectedOrderId = order.id;
    this.showDetailModal = true;
  }

  onModalClose(): void {
    this.showDetailModal = false;
    this.selectedOrderId = null;
  }

  async onCleanupExpiredOrders(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Xác nhận xóa đơn quá hạn',
      message: 'Hệ thống sẽ dọn nền toàn bộ đơn hàng cũ hơn số ngày lưu trữ đang cấu hình trong Cài đặt. Tiếp tục?',
      confirmText: 'Bắt đầu dọn',
      cancelText: 'Hủy',
      confirmButtonClass: 'btn-danger'
    });

    if (!confirmed || this.isCleaningExpiredOrders) {
      return;
    }

    this.orderService.cleanupExpired().subscribe({
      next: (response) => {
        const result = response.data;
        if (!result) {
          this.notificationService.error('Không thể khởi động cleanup đơn hàng quá hạn', 5000);
          return;
        }

        this.isCleaningExpiredOrders = result.running;
        if (result.running) {
          this.startCleanupStatusPolling();
        }

        if (result.started) {
          this.notificationService.info(
            `Đã bắt đầu dọn nền đơn hàng quá hạn (quá ${result.cleanupDays} ngày). Có thể rời trang.`,
            5000
          );
        } else if (result.running) {
          this.notificationService.info('Cleanup đơn hàng quá hạn đang chạy.', 5000);
        } else {
          this.notificationService.warning('Không thể khởi động cleanup đơn hàng quá hạn.', 5000);
        }
      },
      error: (error: any) => {
        console.error('Error starting cleanup job:', error);
        const message = error?.error?.message || 'Lỗi khi khởi động cleanup đơn hàng quá hạn';
        this.notificationService.error(message, 5000);
      }
    });
  }

  private loadCleanupStatus(announceCompletion: boolean): void {
    this.orderService.getCleanupExpiredStatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.applyCleanupStatus(response.data, announceCompletion);
        }
      },
      error: (error: any) => {
        console.error('Error loading cleanup status:', error);
      }
    });
  }

  private applyCleanupStatus(status: OrderCleanupStatus, announceCompletion: boolean): void {
    const wasRunning = this.isCleaningExpiredOrders;
    this.isCleaningExpiredOrders = status.running;

    if (status.running) {
      this.startCleanupStatusPolling();
      return;
    }

    this.stopCleanupStatusPolling();

    if (!announceCompletion || !wasRunning) {
      return;
    }

    this.paginationConfig.currentPage = 0;
    this.loadOrders();

    if (status.lastError) {
      this.notificationService.error(`Cleanup đơn hàng quá hạn thất bại: ${status.lastError}`, 5000);
      return;
    }

    if (!status.lastResult) {
      this.notificationService.info('Cleanup đơn hàng quá hạn đã kết thúc.', 5000);
      return;
    }

    if (status.lastResult.ordersDeleted === 0) {
      this.notificationService.info(
        `Không có đơn hàng quá hạn để xóa (quá ${status.lastResult.cleanupDays} ngày)`,
        5000
      );
      return;
    }

    this.notificationService.success(
      `Đã xóa ${status.lastResult.ordersDeleted} đơn hàng, ${status.lastResult.productItemsDeleted} tài khoản`,
      5000
    );
  }

  private startCleanupStatusPolling(): void {
    if (this.cleanupStatusPollingSub) {
      return;
    }

    this.cleanupStatusPollingSub = interval(5000).subscribe(() => {
      this.loadCleanupStatus(true);
    });
  }

  private stopCleanupStatusPolling(): void {
    this.cleanupStatusPollingSub?.unsubscribe();
    this.cleanupStatusPollingSub = null;
  }

  async onDeleteOrder(id: number): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc muốn xóa đơn hàng này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      this.orderService.delete(id).subscribe({
        next: () => {
          this.notificationService.success('Xóa đơn hàng thành công');
          this.loadOrders();
        },
        error: (error: any) => {
          console.error('Error deleting order:', error);
          this.notificationService.error('Lỗi khi xóa đơn hàng');
        }
      });
    }
  }

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
