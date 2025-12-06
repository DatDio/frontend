import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CategoryService } from '../../../../core/services/category.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { Category } from '../../../../core/models/category.model';
import { CategoryModalComponent } from '../category-modal/category-modal.component';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../../shared/services/pagination.service';
import { ActiveStatusSelectComponent } from '../../../../shared/components/active-status-select/active-status-select.component';
import { ActiveStatusBadgeComponent } from '../../../../shared/components/active-status-badge/active-status-badge.component';
@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule,
    CategoryModalComponent,
    PaginationComponent,
    ActiveStatusSelectComponent,
    ActiveStatusBadgeComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class CategoryListComponent implements OnInit {
  readonly #categoryService = inject(CategoryService);
  readonly #notificationService = inject(NotificationService);
  readonly #confirmService = inject(ConfirmService);
  readonly #fb = inject(FormBuilder);
  readonly #paginationService = inject(PaginationService);

  categories: Category[] = [];
  loading = true;
  showModal = false;
  modalMode: 'create' | 'update' = 'create';
  selectedCategory: Category | null = null;
  searchForm!: FormGroup;

  paginationConfig: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };

  ngOnInit(): void {
    this.initSearchForm();
    this.loadCategories();
  }

  private initSearchForm(): void {
    this.searchForm = this.#fb.group({
      name: [''],
      status: ['']
    });
  }

  loadCategories(): void {
    this.loading = true;
    const filter = {
      name: this.searchForm.get('name')?.value || undefined,
      status: this.searchForm.get('status')?.value || undefined,
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize
    };

    this.#categoryService.list(filter).subscribe({
      next: (response) => {
        if (response.success) {
          this.categories = response.data.content || [];
          this.paginationConfig = this.#paginationService.extractPaginationInfo(response.data);
        } else {
          this.#notificationService.error(response.message || 'Có lỗi xảy ra khi tải danh mục');
        }
        this.loading = false;
      },
      error: (error) => {
        this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra khi tải danh mục');
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedCategory = null;
    this.showModal = true;
  }

  openUpdateModal(category: Category): void {
    this.modalMode = 'update';
    this.selectedCategory = category;
    this.showModal = true;
  }

  onModalClose(result: Category | null): void {
    this.showModal = false;
    if (result) {
      this.loadCategories();
    }
  }

  async deleteCategory(id: number): Promise<void> {
    const confirmed = await this.#confirmService.confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc muốn xóa danh mục này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      this.#categoryService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.#notificationService.success('Xóa danh mục thành công');
            this.loadCategories();
          } else {
            this.#notificationService.error(response.message || 'Failed to delete category');
          }
        },
        error: (error) => {
          this.#notificationService.error(error.error?.message || 'An error occurred');
        }
      });
    }
  }

  handleSearch(): void {
    this.paginationConfig.currentPage = 0;
    this.loadCategories();
  }

  clearForm(): void {
    this.searchForm.reset();
    this.paginationConfig.currentPage = 0;
    this.loadCategories();
  }

  handlePageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.loadCategories();
  }

  selectPageSize(pageSize: number): void {
    this.paginationConfig.pageSize = pageSize;
    this.paginationConfig.currentPage = 0;
    this.loadCategories();
  }
}
