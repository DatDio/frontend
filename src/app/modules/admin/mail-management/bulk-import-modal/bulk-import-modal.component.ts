import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductItemService } from '../../../../core/services/product-item.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductItemCreate } from '../../../../core/models/product-item.model';

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
    const accounts = this.accountsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (accounts.length === 0) {
      this.notificationService.error('Lỗi', 'Vui lòng nhập ít nhất một tài khoản');
      return;
    }

    if (!this.productId) {
      this.notificationService.error('Lỗi', 'Product ID không tồn tại');
      return;
    }

    const items: ProductItemCreate[] = accounts.map((account) => ({
      productId: this.productId!,
      accountData: account
    }));

    this.isLoading = true;
    this.productItemService.bulkCreate(items).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.accountsText = '';
          this.notificationService.success('Thành công', `Đã nhập ${items.length} tài khoản`);
          this.successImport.emit();
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Error importing accounts:', error);
        this.notificationService.error('Lỗi', 'Lỗi khi nhập tài khoản');
      }
    });
  }
}
