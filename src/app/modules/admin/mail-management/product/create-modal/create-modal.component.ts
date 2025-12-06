import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../../../../../core/models/category.model';
import { ProductService } from '../../../../../core/services/product.service';
import { NotificationService } from '../../../../../core/services/notification.service';

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
      status: ['1', Validators.required] // default to "Hoat dong"
    });
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
    const formData = {
      ...this.createForm.value,
      categoryId: Number(this.createForm.get('categoryId')?.value)
    };

    this.productService.create(formData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.notificationService.success('Tạo sản phẩm thành công');
          this.createForm.reset({ status: '1' });
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
