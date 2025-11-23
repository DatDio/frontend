import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TransactionResponse } from '../../../../core/models/transaction.model';
import { TransactionService } from '../../../../core/services/transaction.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';

interface TransactionSearchFilter {
  transactionCode?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
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
      status: new FormControl(''),
      minAmount: new FormControl(''),
      maxAmount: new FormControl(''),
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
    this.formSearch = this.createSearchForm();
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {};
    this.loadTransactions();
  }

  private loadTransactions(): void {
    const params: any = {
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize,
      sort: 'id,desc'
    };
    
    if (this.dataFormSearch.transactionCode) {
      params.transactionCode = this.dataFormSearch.transactionCode;
    }
    if (this.dataFormSearch.status) {
      params.status = this.dataFormSearch.status;
    }
    if (this.dataFormSearch.minAmount) {
      params.minAmount = Number.parseFloat(this.dataFormSearch.minAmount as any);
    }
    if (this.dataFormSearch.maxAmount) {
      params.maxAmount = Number.parseFloat(this.dataFormSearch.maxAmount as any);
    }

    this.transactionService.list(params).subscribe({
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
      processing: 'Đang xử lý',
      completed: 'Hoàn thành',
      failed: 'Thất bại'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      pending: 'bg-warning',
      processing: 'bg-info',
      completed: 'bg-success',
      failed: 'bg-danger'
    };
    return classMap[status] || 'bg-secondary';
  }
}
