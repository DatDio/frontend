import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Order } from '../../../../core/models/order.model';
import { OrderService } from '../../../../core/services/order.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { OrderDetailModalComponent } from '../order-detail-modal/order-detail-modal.component';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent, OrderDetailModalComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class OrderListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);

  orders: Order[] = [];
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  searchOrderNumber = '';
  searchEmail = '';
  searchStatus = '';

  selectedOrder: Order | null = null;
  showDetailModal = false;

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.orderService
      .list({
        page: this.currentPage,
        limit: this.pageSize,
        sort: 'id,desc',
        orderNumber: this.searchOrderNumber || undefined,
        userEmail: this.searchEmail || undefined,
        orderStatus: this.searchStatus || undefined
      })
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data?.content) {
            this.orders = response.data.content;
            this.totalElements = response.data.totalElements || 0;
            this.totalPages = response.data.totalPages || 0;
          }
        },
        error: (error: any) => {
          console.error('Error loading orders:', error);
          this.notificationService.error('Lỗi', 'Lỗi khi tải danh sách đơn hàng');
        }
      });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadOrders();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadOrders();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadOrders();
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
          this.notificationService.success('Thành công', 'Xóa đơn hàng thành công');
          this.loadOrders();
        },
        error: (error: any) => {
          console.error('Error deleting order:', error);
          this.notificationService.error('Lỗi', 'Lỗi khi xóa đơn hàng');
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