import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Product } from '../../../../../core/models/product.model';
import { Category } from '../../../../../core/models/category.model';
import { ProductService } from '../../../../../core/services/product.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { PaginationComponent, PaginationConfig } from '../../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../../shared/services/pagination.service';
import { ProductCreateModalComponent } from '../create-modal/create-modal.component';
import { ProductUpdateModalComponent } from '../update-modal/update-modal.component';
import { ActiveStatusSelectComponent } from '../../../../../shared/components/active-status-select/active-status-select.component';
import { ActiveStatusBadgeComponent } from '../../../../../shared/components/active-status-badge/active-status-badge.component';
interface ProductSearchFilter {
  name?: string;
  categoryId?: number;
  status?: string;
  pagination?: any;
}

@Component({
  selector: 'app-mail-management-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    ProductCreateModalComponent,
    ProductUpdateModalComponent,
    ActiveStatusSelectComponent,
    ActiveStatusBadgeComponent
  ],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class MailManagementListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly paginationService = inject(PaginationService);

  products: Product[] = [];
  categories: Category[] = [];
  loading = true;
  showCreateModal = false;
  showUpdateModal = false;
  selectedProduct: Product | null = null;

  paginationConfig: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };

  dataFormSearch: ProductSearchFilter = {};
  formSearch!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
    this.loadProducts();
  }

  private initForm(): void {
    this.formSearch = this.createSearchForm();
  }

  private createSearchForm(): FormGroup {
    return this.fb.group({
      name: new FormControl(''),
      categoryId: new FormControl(''),
      status: new FormControl(''),
      searchPage: new FormControl('')
    });
  }

  private loadCategories(): void {
    this.categoryService.list({ page: 0, limit: 100 }).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.content) {
          this.categories = response.data.content;
        }
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  handleSearch(): void {
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadProducts();
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
      this.loadProducts();
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
    this.loadProducts();
  }

  handlePageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.dataFormSearch = {
      ...this.formSearch.getRawValue(),
      pagination: this.paginationConfig
    };
    this.loadProducts();
  }

  clearForm(): void {
    this.formSearch.reset({
      name: '',
      categoryId: '',
      status: '',
      searchPage: ''
    });
    this.paginationConfig.currentPage = 0;
    this.dataFormSearch = {};
    this.loadProducts();
  }

  private loadProducts(): void {
    this.loading = true;
    const filter = {
      name: this.dataFormSearch.name || undefined,
      categoryId: this.dataFormSearch.categoryId ? Number(this.dataFormSearch.categoryId) : undefined,
      status: this.dataFormSearch.status || undefined,
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize
    };

    this.productService.list(filter).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.products = response.data.content || [];
          this.paginationConfig = this.paginationService.extractPaginationInfo(response.data);
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.notificationService.error('Lỗi khi tải danh sách sản phẩm');
        this.loading = false;
      }
    });
  }

  onDetail(product: Product): void {
    this.router.navigate(['/admin/mail-management', product.id, 'items'], {
      state: { productName: product.name }
    });
  }

  onCreateClick(): void {
    this.showCreateModal = true;
  }

  onCreateModalClose(): void {
    this.showCreateModal = false;
  }

  onCreateSuccess(): void {
    this.showCreateModal = false;
    this.clearForm();
  }

  onEditClick(product: Product): void {
    this.selectedProduct = product;
    this.showUpdateModal = true;
  }

  onUpdateModalClose(): void {
    this.showUpdateModal = false;
    this.selectedProduct = null;
  }

  onUpdateSuccess(): void {
    this.showUpdateModal = false;
    this.selectedProduct = null;
    this.loadProducts();
  }

  async onDeleteClick(id: number): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc muốn xóa sản phẩm này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      this.productService.delete(id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.notificationService.success('Xóa sản phẩm thành công');
            this.loadProducts();
          }
        },
        error: (error: any) => {
          this.notificationService.error('Lỗi khi xóa sản phẩm');
        }
      });
    }
  }
}
