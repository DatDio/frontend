import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../../../../../core/models/category.model';
import { ProductService } from '../../../../../core/services/product.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-product-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-modal.component.html',
  styleUrl: './create-modal.component.scss'
})
export class ProductCreateModalComponent implements OnInit {
  @Input() categories: Category[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() successCreate = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly notificationService = inject(NotificationService);

  createForm!: FormGroup;
  isLoading = false;

  // Image upload
  imagePreview: string | null = null;
  imageFile: File | null = null;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(1)]],
      liveTime: [''],
      country: [''],
      categoryId: ['', Validators.required],
      status: ['1', Validators.required],
      sortOrder: [0],
      minSecondaryStock: [500, [Validators.min(0)]],
      maxSecondaryStock: [1000, [Validators.min(1)]],
      expirationHours: [0, [Validators.min(0)]]
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        this.notificationService.error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp, svg)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.error('Kích thước file không được vượt quá 5MB');
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
    const formValue = this.createForm.value;

    formData.append('name', formValue.name.trim());
    if (formValue.description?.trim()) {
      formData.append('description', formValue.description.trim());
    }
    formData.append('price', formValue.price.toString());
    if (formValue.liveTime?.trim()) {
      formData.append('liveTime', formValue.liveTime.trim());
    }
    if (formValue.country?.trim()) {
      formData.append('country', formValue.country.trim());
    }
    formData.append('categoryId', formValue.categoryId.toString());
    formData.append('sortOrder', (formValue.sortOrder ?? 0).toString());
    formData.append('minSecondaryStock', (formValue.minSecondaryStock ?? 500).toString());
    formData.append('maxSecondaryStock', (formValue.maxSecondaryStock ?? 1000).toString());
    formData.append('expirationHours', (formValue.expirationHours ?? 0).toString());

    if (this.imageFile) {
      formData.append('image', this.imageFile);
    }

    return formData;
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.createForm.invalid) {
      this.notificationService.error('Vui lòng kiểm tra lại thông tin');
      return;
    }

    this.isLoading = true;
    const formData = this.buildFormData();

    this.productService.create(formData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.notificationService.success('Tạo sản phẩm thành công');
          this.createForm.reset({ status: '1' });
          this.imageFile = null;
          this.imagePreview = null;
          this.successCreate.emit();
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.notificationService.error('Có lỗi xảy ra: ' + (error.error?.message || 'Không thể tạo sản phẩm'));
      }
    });
  }
}
