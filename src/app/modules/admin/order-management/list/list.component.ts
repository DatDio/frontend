import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Order } from '../../../../core/models/order.model';
import { OrderService } from '../../../../core/services/order.service';
import { NotificationService } from '../../../../core/services/notification.service';
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
export class OrderListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
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

  selectedOrder: Order | null = null;
  showDetailModal = false;

  ngOnInit(): void {
    this.initForm();
    this.loadOrders();
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
        console.error('Error loading orders:', error);
        this.notificationService.error('Lỗi khi tải danh sách đơn hàng');
      }
    });
  }

  onViewDetail(order: Order): void {
    this.selectedOrder = order;
    this.showDetailModal = true;
  }

  onModalClose(): void {
    this.showDetailModal = false;
    this.selectedOrder = null;
  }

  onDeleteOrder(id: number): void {
    if (confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
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
      pending: 'Chờ xử lý',
      processing: 'Đang xử lý',
      completed: 'Hoàn thành',
      cancelled: 'Hủy'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      pending: 'bg-warning',
      processing: 'bg-info',
      completed: 'bg-success',
      cancelled: 'bg-danger'
    };
    return classMap[status] || 'bg-secondary';
  }
}