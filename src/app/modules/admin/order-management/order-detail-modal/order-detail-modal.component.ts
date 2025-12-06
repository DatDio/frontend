import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Order } from '../../../../core/models/order.model';
import { OrderService } from '../../../../core/services/order.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-detail-modal.component.html',
  styleUrl: './order-detail-modal.component.scss'
})
export class OrderDetailModalComponent implements OnInit {
  @Input() orderId!: number;
  @Output() closeModal = new EventEmitter<void>();

  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);

  order: Order | null = null;
  loading = true;
  copied = false;

  ngOnInit(): void {
    this.loadOrderDetail();
  }

  private loadOrderDetail(): void {
    this.loading = true;
    this.orderService.getById(this.orderId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.order = response.data;
        } else {
          this.notificationService.error('Không thể tải thông tin đơn hàng');
          this.onClose();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading order:', error);
        this.notificationService.error('Lỗi khi tải thông tin đơn hàng');
        this.loading = false;
        this.onClose();
      }
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  copyAccounts(): void {
    if (!this.order?.accountData || this.order.accountData.length === 0) {
      this.notificationService.warning('Không có dữ liệu tài khoản để sao chép');
      return;
    }

    const accountText = this.order.accountData.join('\n');
    navigator.clipboard.writeText(accountText).then(() => {
      this.copied = true;
      this.notificationService.success('Đã sao chép thông tin tài khoản');
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    }).catch(() => {
      this.notificationService.error('Không thể sao chép');
    });
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      PENDING: 'Chờ xử lý',
      PAID: 'Đã thanh toán',
      CONFIRMED: 'Đã xác nhận',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      REFUNDED: 'Đã hoàn tiền'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      PENDING: 'badge-warning',
      PAID: 'badge-info',
      CONFIRMED: 'badge-primary',
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-danger',
      REFUNDED: 'badge-secondary'
    };
    return classMap[status] || 'badge-secondary';
  }
}
