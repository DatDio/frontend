import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductItemService } from '../../../../../core/services/product-item.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ProductItemCreate } from '../../../../../core/models/product-item.model';

@Component({
  selector: 'app-bulk-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-import-modal.component.html',
  styleUrl: './bulk-import-modal.component.scss'
})
export class BulkImportModalComponent {
  @Input() productId: number | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() successImport = new EventEmitter<void>();

  private readonly productItemService = inject(ProductItemService);
  private readonly notificationService = inject(NotificationService);

  accountsText = '';
  isLoading = false;

  onClose(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    const accounts = this.accountsText;

    if (accounts.length === 0) {
      this.notificationService.error( 'Vui lòng nhập ít nhất một tài khoản');
      return;
    }

    if (!this.productId) {
      this.notificationService.error( 'Product ID không tồn tại');
      return;
    }

    const items: ProductItemCreate = {
      productId: this.productId!,
      accountData: accounts
    };

    this.isLoading = true;
    this.productItemService.create(items).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.accountsText = '';
          this.notificationService.success(`Đã nhập tài khoản`);
          this.successImport.emit();
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.notificationService.error('Lỗi khi nhập tài khoản');
      }
    });
  }
}
