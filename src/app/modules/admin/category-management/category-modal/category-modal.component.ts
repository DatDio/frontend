import { Component, OnInit, inject, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../../../core/services/category.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Category } from '../../../../core/models/category.model';
import { STATUS_ENUM, STATUS_OPTIONS } from '../../../../core/enums/status.enum';
import { environment } from '../../../../../environments/environment';

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

  // Image upload
  imagePreview: string | null = null;
  imageFile: File | null = null;

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
        status: String(this.category.status)
      });
      // Set preview for existing image
      if (this.category.imageUrl) {
        this.imagePreview = this.getFullImageUrl(this.category.imageUrl);
      }
    }
  }

  private getFullImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    return environment.apiBaseUrl + imageUrl;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        this.#notificationService.error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp, svg)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.#notificationService.error('Kích thước file không được vượt quá 5MB');
        return;
      }

      this.imageFile = file;
      this.imagePreview = URL.createObjectURL(file);
    }
  }

  removeImage(): void {
    this.imageFile = null;
    this.imagePreview = null;
  }

  private buildFormData(): FormData {
    const formData = new FormData();
    const formValue = this.form.value;

    formData.append('name', formValue.name.trim());
    if (formValue.description?.trim()) {
      formData.append('description', formValue.description.trim());
    }
    formData.append('status', formValue.status.toString());

    if (this.imageFile) {
      formData.append('image', this.imageFile);
    }

    return formData;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.#notificationService.warning('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    this.submitted = true;
    this.loading = true;

    const formData = this.buildFormData();

    if (this.mode === 'create') {
      this.#categoryService.create(formData).subscribe({
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

      this.#categoryService.update(this.category.id, formData).subscribe({
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

  get name() { return this.form.get('name'); }
  get description() { return this.form.get('description'); }
  get status() { return this.form.get('status'); }
}
