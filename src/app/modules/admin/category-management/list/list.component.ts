import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../../core/services/category.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Category } from '../../../../core/models/category.model';
import { CategoryModalComponent } from '../category-modal/category-modal.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoryModalComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class CategoryListComponent implements OnInit {
  readonly #categoryService = inject(CategoryService);
  readonly #notificationService = inject(NotificationService);

  categories: Category[] = [];
  loading = true;
  showModal = false;
  modalMode: 'create' | 'update' = 'create';
  selectedCategory: Category | null = null;

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;

    this.#categoryService.list().subscribe({
      next: (response) => {
        if (response.success) {
          const data = response.data;
          this.categories = this.extractCategories(data);
          this.#notificationService.success('Categories loaded');
        } else {
          this.#notificationService.error(response.message || 'Failed to load categories');
        }
        this.loading = false;
      },
      error: (error) => {
        this.#notificationService.error(error.error?.message || 'An error occurred');
        this.loading = false;
      }
    });
  }

  private extractCategories(data: any): Category[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      if ('items' in data) {
        return data.items as Category[];
      }
    }
    return [];
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

  deleteCategory(id: number): void {
    if (confirm('Are you sure you want to delete this category?')) {
      this.#categoryService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.#notificationService.success('Category deleted successfully');
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
}
