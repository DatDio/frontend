import { Component, OnInit, inject, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../../../core/services/category.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Category, CategoryCreate, CategoryUpdate } from '../../../../core/models/category.model';
import { STATUS_ENUM, STATUS_OPTIONS } from '../../../../core/enums/status.enum';

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-modal.component.html',
  styleUrls: ['./category-modal.component.scss']
})
export class CategoryModalComponent implements OnInit {
  readonly #categoryService = inject(CategoryService);
  readonly #notificationService = inject(NotificationService);
  readonly #formBuilder = inject(FormBuilder);

  @Input() mode: 'create' | 'update' = 'create';
  @Input() category: Category | null = null;
  @Output() closed = new EventEmitter<Category | null>();

  form!: FormGroup;
  loading = false;
  submitted = false;
  readonly statusOptions = STATUS_OPTIONS;
  readonly statusEnum = STATUS_ENUM;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.#formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      status: [STATUS_ENUM.ACTIVE, Validators.required]
    });

    if (this.mode === 'update' && this.category) {
      this.form.patchValue({
        name: this.category.name,
        description: this.category.description || '',
        status: String(this.category.status) // Convert to string for select binding
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.#notificationService.warning('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    this.submitted = true;
    this.loading = true;

    const formValue = this.form.value;

    if (this.mode === 'create') {
      const request: CategoryCreate = {
        name: formValue.name,
        status: formValue.status,
        ...(formValue.description?.trim() && { description: formValue.description.trim() })
      };

      this.#categoryService.create(request).subscribe({
        next: (response) => {
          if (response.success) {
            this.#notificationService.success('Tạo danh mục thành công');
            this.closed.emit(response.data);
          } else {
            this.#notificationService.error(response.message || 'Có lỗi xảy ra');
          }
          this.loading = false;
        },
        error: (error) => {
          this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
          this.loading = false;
        }
      });
    } else {
      if (!this.category) return;

      const request: CategoryUpdate = {
        id: this.category.id,
        name: formValue.name,
        status: Number(formValue.status),
        ...(formValue.description?.trim() && { description: formValue.description.trim() })
      };

      this.#categoryService.update(request).subscribe({
        next: (response) => {
          if (response.success) {
            this.#notificationService.success('Cập nhật thành công');
            this.closed.emit(response.data);
          } else {
            this.#notificationService.error(response.message || 'Có lỗi xảy ra');
          }
          this.loading = false;
        },
        error: (error) => {
          this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
          this.loading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.closed.emit(null);
  }

  get name() {
    return this.form.get('name');
  }

  get description() {
    return this.form.get('description');
  }

  get status() {
    return this.form.get('status');
  }
}
