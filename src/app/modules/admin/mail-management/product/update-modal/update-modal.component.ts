import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../../../../../core/models/category.model';
import { Product } from '../../../../../core/models/product.model';
import { ProductService } from '../../../../../core/services/product.service';
import { NotificationService } from '../../../../../core/services/notification.service';

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

  ngOnInit(): void {
    this.initForm();
    this.loadProductData();
  }

  private initForm(): void {
    this.updateForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      categoryId: ['', Validators.required],
      status: ['active', Validators.required]
    });
  }

  private loadProductData(): void {
    if (this.product) {
      this.updateForm.patchValue({
        name: this.product.name,
        description: this.product.description,
        price: this.product.price,
        categoryId: this.product.categoryId,
        status: this.product.status
      });
    }
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
    const formData = {
      id: this.product.id,
      ...this.updateForm.value,
      categoryId: Number(this.updateForm.get('categoryId')?.value)
    };

    this.productService.update(formData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.notificationService.success('Cập nhật sản phẩm thành công');
          this.successUpdate.emit();
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.notificationService.error('Lỗi khi cập nhật sản phẩm');
      }
    });
  }
}
