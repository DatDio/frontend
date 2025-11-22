import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TransactionResponse } from '../../../../core/models/transaction.model';
import { TransactionService } from '../../../../core/services/transaction.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-client-transaction-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ClientTransactionListComponent implements OnInit {
  private readonly transactionService = inject(TransactionService);
  private readonly notificationService = inject(NotificationService);

  transactions: TransactionResponse[] = [];
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  searchCode = '';
  searchStatus = '';

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.transactionService
      .list({
        page: this.currentPage,
        limit: this.pageSize,
        sort: 'id,desc',
        transactionCode: this.searchCode || undefined,
        status: this.searchStatus || undefined
      })
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data?.content) {
            this.transactions = response.data.content;
            this.totalElements = response.data.totalElements || 0;
            this.totalPages = response.data.totalPages || 0;
          }
        },
        error: (error: any) => {
          console.error('Error loading transactions:', error);
          this.notificationService.error('Lỗi', 'Lỗi khi tải danh sách giao dịch');
        }
      });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadTransactions();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadTransactions();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadTransactions();
  }

  getTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      deposit: 'Nạp tiền',
      withdrawal: 'Rút tiền',
      purchase: 'Mua hàng',
      refund: 'Hoàn tiền'
    };
    return typeMap[type] || type;
  }

  getTypeClass(type: string): string {
    const classMap: { [key: string]: string } = {
      deposit: 'badge-success',
      withdrawal: 'badge-warning',
      purchase: 'badge-danger',
      refund: 'badge-info'
    };
    return classMap[type] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Chờ xử lý',
      completed: 'Hoàn thành',
      failed: 'Thất bại',
      cancelled: 'Hủy'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      pending: 'badge-warning',
      completed: 'badge-success',
      failed: 'badge-danger',
      cancelled: 'badge-secondary'
    };
    return classMap[status] || 'badge-secondary';
  }

  getAmountColor(type: string): string {
    return type === 'withdrawal' ? 'text-danger' : 'text-success';
  }
}
