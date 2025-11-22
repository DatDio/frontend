import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductItem } from '../../../../core/models/product-item.model';
import { ProductItemService } from '../../../../core/services/product-item.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { BulkImportModalComponent } from '../bulk-import-modal/bulk-import-modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-product-item-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BulkImportModalComponent, PaginationComponent],
  templateUrl: './product-item-list.component.html',
  styleUrl: './product-item-list.component.scss'
})
export class ProductItemListComponent implements OnInit {
  private readonly productItemService = inject(ProductItemService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  productId: number | null = null;
  items: ProductItem[] = [];
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  showImportModal = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.productId = Number.parseInt(id, 10);
        this.loadItems();
      }
    });
  }

  loadItems(): void {
    if (!this.productId) return;

    this.productItemService
      .list(this.productId, {
        page: this.currentPage,
        limit: this.pageSize,
        sort: 'id,desc'
      })
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
          this.notificationService.error('Lỗi', 'Lỗi khi tải danh sách tài khoản');
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
    this.notificationService.success('Thành công', 'Nhập tài khoản thành công');
  }

  onDeleteItem(id: number): void {
    if (confirm('Bạn có chắc muốn xóa tài khoản này?')) {
      this.productItemService.delete(id).subscribe({
        next: () => {
          this.notificationService.success('Thành công', 'Xóa tài khoản thành công');
          this.loadItems();
        },
        error: (error: any) => {
          console.error('Error deleting item:', error);
          this.notificationService.error('Lỗi', 'Lỗi khi xóa tài khoản');
        }
      });
    }
  }
}
