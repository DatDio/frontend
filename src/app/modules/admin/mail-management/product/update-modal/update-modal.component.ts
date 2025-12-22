import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../../../../../core/models/category.model';
import { Product } from '../../../../../core/models/product.model';
import { ProductService } from '../../../../../core/services/product.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-product-update-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-modal.component.html',
  styleUrl: './update-modal.component.scss'
})
export class ProductUpdateModalComponent implements OnInit {
  @Input() product!: Product;
  @Input() categories: Category[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() successUpdate = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly notificationService = inject(NotificationService);

  updateForm!: FormGroup;
  isLoading = false;

  // Image upload
  imagePreview: string | null = null;
  imageFile: File | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadProductData();
  }

  private initForm(): void {
    this.updateForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(1)]],
      liveTime: [''],
      country: [''],
      categoryId: ['', Validators.required],
      status: ['1', Validators.required],
      sortOrder: [0]
    });
  }

  private loadProductData(): void {
    if (this.product) {
      this.updateForm.patchValue({
        name: this.product.name,
        description: this.product.description,
        price: this.product.price,
        liveTime: this.product.liveTime,
        country: this.product.country,
        categoryId: this.product.categoryId,
        status: this.product.status,
        sortOrder: this.product.sortOrder ?? 0
      });
      // Set preview for existing image
      if (this.product.imageUrl) {
        this.imagePreview = this.getFullImageUrl(this.product.imageUrl);
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
    const formValue = this.updateForm.value;

    formData.append('id', this.product.id.toString());
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
    formData.append('status', formValue.status.toString());
    formData.append('sortOrder', (formValue.sortOrder ?? 0).toString());

    if (this.imageFile) {
      formData.append('image', this.imageFile);
    }

    return formData;
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.updateForm.invalid) {
      this.notificationService.error('Vui lòng kiểm tra lại thông tin');
      return;
    }

    this.isLoading = true;
    const formData = this.buildFormData();

    this.productService.update(this.product.id, formData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.notificationService.success('Cập nhật sản phẩm thành công');
          this.successUpdate.emit();
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.notificationService.error('Lỗi khi cập nhật sản phẩm: ' + (error.error?.message || ''));
      }
    });
  }
}
