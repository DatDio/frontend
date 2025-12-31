import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductItem } from '../../../../../core/models/product-item.model';
import { ProductItemService } from '../../../../../core/services/product-item.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { BulkImportModalComponent } from '../bulk-import-modal/bulk-import-modal.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-product-item-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, BulkImportModalComponent, PaginationComponent],
  templateUrl: './product-item-list.component.html',
  styleUrl: './product-item-list.component.scss'
})
export class ProductItemListComponent implements OnInit {
  private readonly productItemService = inject(ProductItemService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmService = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

  productId: number | null = null;
  productName = '';
  items: ProductItem[] = [];
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  showImportModal = false;
  showBulkDeleteModal = false;
  bulkDeleteData = '';
  searchForm!: FormGroup;

  ngOnInit(): void {
    this.initSearchForm();

    // Get product name from route state (passed from product list page)
    // Only access history in browser environment
    if (isPlatformBrowser(this.platformId)) {
      const state = history.state as { productName?: string };
      if (state?.productName) {
        this.productName = state.productName;
      }
    }

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.productId = Number.parseInt(id, 10);
        this.loadItems();
      }
    });
  }

  initSearchForm(): void {
    this.searchForm = this.fb.group({
      accountData: [''],
      sold: [''],
      expirationType: ['']
    });
  }

  loadItems(): void {
    if (!this.productId) return;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    const accountData = this.searchForm.get('accountData')?.value;
    const sold = this.searchForm.get('sold')?.value;
    const expirationType = this.searchForm.get('expirationType')?.value;

    if (accountData) {
      params.accountData = accountData;
    }
    if (sold !== '') {
      params.sold = sold === 'true';
    }
    if (expirationType) {
      params.expirationType = expirationType;
    }

    this.productItemService
      .list(this.productId, params)
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.items = response.data.content || [];
            this.totalElements = response.data.totalElements || 0;
            this.totalPages = response.data.totalPages || 0;
          }
        },
        error: (error: any) => {
          console.error('Error loading items:', error);
          this.notificationService.error('Lỗi khi tải danh sách tài khoản');
        }
      });
  }

  onPreviousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadItems();
    }
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadItems();
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadItems();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadItems();
  }

  onImportClick(): void {
    this.showImportModal = true;
  }

  onModalClose(): void {
    this.showImportModal = false;
  }

  onImportSuccess(): void {
    this.showImportModal = false;
    this.currentPage = 0;
    this.loadItems();
    //this.notificationService.success('Nhập tài khoản thành công');
  }

  async onDeleteItem(id: number): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc muốn xóa tài khoản này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      this.productItemService.delete(id).subscribe({
        next: () => {
          this.notificationService.success('Xóa tài khoản thành công');
          this.loadItems();
        },
        error: (error: any) => {
          console.error('Error deleting item:', error);
          this.notificationService.error('Lỗi khi xóa tài khoản');
        }
      });
    }
  }

  handleSearch(): void {
    this.currentPage = 0;
    this.loadItems();
  }

  clearForm(): void {
    this.searchForm.reset({
      accountData: '',
      sold: '',
      expirationType: ''
    });
    this.currentPage = 0;
    this.loadItems();
  }

  // ============ BULK OPERATIONS ============

  /**
   * Tải danh sách email hết hạn
   */
  onDownloadExpired(): void {
    if (!this.productId) return;

    this.productItemService.getExpiredItems(this.productId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const expiredItems = response.data;
          if (expiredItems.length === 0) {
            this.notificationService.info('Không có tài khoản hết hạn');
            return;
          }

          // Create download content
          const content = expiredItems.map(item => item.accountData).join('\n');
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `expired_emails_${this.productName || this.productId}_${new Date().toISOString().slice(0, 10)}.txt`;
          link.click();
          window.URL.revokeObjectURL(url);

          this.notificationService.success(`Đã tải ${expiredItems.length} tài khoản hết hạn`);
        }
      },
      error: (error) => {
        console.error('Error downloading expired items:', error);
        this.notificationService.error('Lỗi khi tải danh sách hết hạn');
      }
    });
  }

  /**
   * Xóa tất cả email hết hạn
   */
  async onDeleteExpired(): Promise<void> {
    if (!this.productId) return;

    const confirmed = await this.confirmService.confirm({
      title: 'Xác nhận xóa mail hết hạn',
      message: 'Bạn có chắc muốn xóa TẤT CẢ tài khoản đã hết hạn? Hành động này không thể hoàn tác!',
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      this.productItemService.deleteExpiredItems(this.productId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.notificationService.success(response.data.message);
            this.loadItems();
          }
        },
        error: (error) => {
          console.error('Error deleting expired items:', error);
          this.notificationService.error('Lỗi khi xóa tài khoản hết hạn');
        }
      });
    }
  }

  /**
   * Mở modal xóa nhiều theo data
   */
  onBulkDeleteClick(): void {
    this.bulkDeleteData = '';
    this.showBulkDeleteModal = true;
  }

  /**
   * Xác nhận xóa nhiều theo data
   */
  async onConfirmBulkDelete(): Promise<void> {
    if (!this.productId || !this.bulkDeleteData?.trim()) return;

    const lines = this.bulkDeleteData.trim().split(/\r?\n/).filter(l => l.trim());
    const confirmed = await this.confirmService.confirm({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa ${lines.length} tài khoản? Hành động này không thể hoàn tác!`,
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      this.productItemService.bulkDelete(this.productId, this.bulkDeleteData).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.notificationService.success(response.data.message);
            this.showBulkDeleteModal = false;
            this.bulkDeleteData = '';
            this.loadItems();
          }
        },
        error: (error) => {
          console.error('Error bulk deleting items:', error);
          this.notificationService.error('Lỗi khi xóa tài khoản');
        }
      });
    }
  }

  /**
   * Tính thời gian hết hạn từ createdAt và expirationHours
   */
  getExpiryTime(createdAt: string, expirationHours: number): Date {
    const created = new Date(createdAt);
    return new Date(created.getTime() + expirationHours * 60 * 60 * 1000);
  }
}
