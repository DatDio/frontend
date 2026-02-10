import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductItemService } from '../../../../../core/services/product-item.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ExpirationType } from '../../../../../core/models/product-item.model';

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

  // ExpirationType enum matching backend
  expirationType: ExpirationType = 'NONE';

  // Option 1: File upload
  selectedFile: File | null = null;
  selectedFileName = '';

  // Option 2: Textarea input
  accountsText = '';

  isLoading = false;
  skipDuplicateCheck = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!file.name.endsWith('.txt')) {
        this.notificationService.error('Chỉ chấp nhận file .txt');
        return;
      }

      this.selectedFile = file;
      this.selectedFileName = file.name;
      // Clear textarea when file is selected
      this.accountsText = '';
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (!this.productId) {
      this.notificationService.error('Product ID không tồn tại');
      return;
    }

    this.isLoading = true;

    // Option 1: File upload (ưu tiên)
    if (this.selectedFile) {
      this.productItemService.importFile(this.productId, this.selectedFile, this.expirationType, this.skipDuplicateCheck).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            this.clearFile();
            this.expirationType = 'NONE';
            this.notificationService.success(response.message ?? 'Import thành công');
            this.successImport.emit();
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.notificationService.error('Lỗi khi import file');
        }
      });
      return;
    }

    // Option 2: Textarea input
    if (this.accountsText.trim()) {
      this.productItemService.createWithExpirationType(
        this.productId,
        this.accountsText,
        this.expirationType,
        this.skipDuplicateCheck
      ).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            this.accountsText = '';
            this.expirationType = 'NONE';
            this.notificationService.success(response.message ?? 'Import thành công');
            this.successImport.emit();
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.notificationService.error('Lỗi khi import tài khoản');
        }
      });
      return;
    }

    this.isLoading = false;
    this.notificationService.error('Vui lòng chọn file hoặc nhập tài khoản');
  }
}
