import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProductItem } from '../../../../../core/models/product-item.model';
import { ProductItemService } from '../../../../../core/services/product-item.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { BulkImportModalComponent } from '../bulk-import-modal/bulk-import-modal.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-product-item-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, BulkImportModalComponent, PaginationComponent],
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
      sold: ['']
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

    if (accountData) {
      params.accountData = accountData;
    }
    if (sold !== '') {
      params.sold = sold === 'true';
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
    this.searchForm.reset();
    this.currentPage = 0;
    this.loadItems();
  }
}
