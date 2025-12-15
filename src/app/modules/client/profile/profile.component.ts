import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { UserService } from '../../../core/services/user.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ActiveStatusBadgeComponent } from '../../../shared/components/active-status-badge/active-status-badge.component';
// IMPORT DỊCH VỤ VÀ MODELS API KEY
import { ApiKeyResponse } from '../../../core/models/api-key.model';
import { ApiKeyService } from '../../../core/services/apikey.service';

// Khai báo biến global Bootstrap
declare var bootstrap: any;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ActiveStatusBadgeComponent, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly seoService = inject(SeoService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly confirmService = inject(ConfirmService);

  profileForm!: FormGroup;
  changePasswordForm!: FormGroup;
  createApiKeyForm!: FormGroup;

  currentUser: User | null = null;
  loading = false;
  submitted = false;
  passwordSubmitted = false;
  activeTab: 'profile' | 'password' | 'apikeys' = 'profile';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  apiKeys: ApiKeyResponse[] = [];
  apiKeyLoading = false;
  apiKeySubmitted = false;

  // DỮ LIỆU MODAL KEY MỚI
  newlyGeneratedKey: { key: string, warning: string } = { key: '', warning: '' };

  ngOnInit(): void {
    this.seoService.setTitle('Hồ sơ cá nhân - MailShop');
    this.seoService.setMetaDescription('Quản lý hồ sơ cá nhân và cài đặt tài khoản của bạn');

    this.initProfileForm(); // Initialize with empty values first
    this.loadUserProfile(); // Then load data from API
    this.initChangePasswordForm();
    this.initCreateApiKeyForm();
    this.loadApiKeys();
  }

  private loadUserProfile(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.notificationService.error('Không tìm thấy thông tin người dùng');
      return;
    }

    this.loading = true;
    this.userService.getByClient(userId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentUser = response.data;
          // Patch form with API data
          this.profileForm.patchValue({
            fullName: response.data.fullName || '',
            email: response.data.email || '',
            phone: response.data.phone || '',
            address: response.data.address || '',
            avatarUrl: response.data.avatarUrl || ''
          });
        } else {
          this.notificationService.error('Không thể tải thông tin người dùng');
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Lỗi khi tải thông tin');
        this.loading = false;
      }
    });
  }

  // --- API KEY MANAGEMENT ---

  private initCreateApiKeyForm(): void {
    this.createApiKeyForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(50)]]
    });
  }

  loadApiKeys(): void {
    this.apiKeyLoading = true;
    this.apiKeyService.list()
      .pipe(finalize(() => this.apiKeyLoading = false))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.apiKeys = res.data;
          }
        },
        error: (err) => {
          this.notificationService.error(err.error?.message || 'Không thể tải danh sách API Key');
        }
      });
  }

  onCreateApiKey(): void {
    this.apiKeySubmitted = true;
    if (this.createApiKeyForm.invalid) return;

    this.apiKeyLoading = true;
    const request = this.createApiKeyForm.value;

    this.apiKeyService.create(request).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          // 1. LƯU VÀ HIỂN THỊ MODAL KEY PLAINTEXT
          this.newlyGeneratedKey = {
            key: res.data.apiKey,
            warning: ''
          };
          this.openKeyModal();

          // 2. Tải lại danh sách
          this.loadApiKeys();
          this.createApiKeyForm.reset();
          this.apiKeySubmitted = false;
        } else {
          this.notificationService.error(res.message || 'Tạo API Key thất bại');
        }
        this.apiKeyLoading = false;
      },
      error: (err) => {
        this.notificationService.error(err.error?.message || 'Lỗi khi tạo API Key');
        this.apiKeyLoading = false;
      }
    });
  }

  async onDeleteApiKey(id: number): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa API Key này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    this.apiKeyLoading = true;
    this.apiKeyService.delete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notificationService.success('Xóa API Key thành công');
          this.loadApiKeys();
        } else {
          this.notificationService.error(res.message || 'Xóa API Key thất bại');
        }
        this.apiKeyLoading = false;
      },
      error: (err) => {
        this.notificationService.error(err.error?.message || 'Lỗi khi xóa API Key');
        this.apiKeyLoading = false;
      }
    });
  }

  // --- MODAL KEY METHODS ---

  openKeyModal(): void {
    const modalElement = document.getElementById('apiKeyModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
      // Khởi tạo Modal và mở
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    } else {
      // Fallback nếu Bootstrap không khả dụng
      prompt('Key mới của bạn (Vui lòng sao chép):', this.newlyGeneratedKey.key);
    }
  }

  copyKeyToClipboard(): void {
    const keyInput = document.getElementById('plaintextKeyInput') as HTMLInputElement;
    const copyButton = document.getElementById('copyKeyButton');

    if (keyInput && copyButton) {
      keyInput.select();
      document.execCommand('copy');

      this.notificationService.success('Đã sao chép API Key vào clipboard!');

      // Cập nhật nút copy
      copyButton.innerHTML = '<i class="bi bi-check-lg"></i> Đã Copy!';
      setTimeout(() => {
        copyButton.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
      }, 2000);
    }
  }

  // --- GENERAL METHODS ---

  private initProfileForm(): void {
    this.profileForm = this.formBuilder.group({
      fullName: [this.currentUser?.fullName || '', [Validators.required, Validators.minLength(2)]],
      email: [{ value: this.currentUser?.email || '', disabled: true }],
      phone: [this.currentUser?.phone || ''],
      address: [this.currentUser?.address || ''],
      avatarUrl: [this.currentUser?.avatarUrl || '']
    });
  }

  private initChangePasswordForm(): void {
    this.changePasswordForm = this.formBuilder.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onUpdateProfile(): void {
    if (this.profileForm.invalid) {
      this.submitted = true;
      this.notificationService.warning('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    this.loading = true;
    this.submitted = true;
    const formValue = this.profileForm.getRawValue();

    if (!this.currentUser) {
      this.notificationService.error('Không tìm thấy người dùng');
      this.loading = false;
      return;
    }

    const updateRequest = {
      id: this.currentUser.id,
      email: this.currentUser.email,
      fullName: formValue.fullName,
      phone: formValue.phone || undefined,
      address: formValue.address || undefined,
      status: this.currentUser.status
    };

    this.userService.updateByClient(updateRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Cập nhật hồ sơ thành công');
          if (response.data && this.currentUser) {
            this.currentUser.fullName = response.data.fullName ?? '';
            this.currentUser.phone = response.data.phone ?? '';
            this.currentUser.address = response.data.address ?? '';
            this.authService['currentUserSubject'].next(response.data);
          }
          this.submitted = false;
        } else {
          this.notificationService.error(response.message || 'Cập nhật hồ sơ thất bại');
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Đã xảy ra lỗi');
        this.loading = false;
      }
    });
  }

  onChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.passwordSubmitted = true;
      this.notificationService.warning('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    this.loading = true;
    this.passwordSubmitted = true;
    const formValue = this.changePasswordForm.value;

    this.authService.changePassword({
      currentPassword: formValue.currentPassword,
      newPassword: formValue.newPassword
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Đổi mật khẩu thành công');
          this.changePasswordForm.reset();
          this.passwordSubmitted = false;
        } else {
          this.notificationService.error(response.message || 'Đổi mật khẩu thất bại');
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Đã xảy ra lỗi');
        this.loading = false;
      }
    });
  }

  setActiveTab(tab: 'profile' | 'password' | 'apikeys'): void {
    this.activeTab = tab;
    this.submitted = false;
    this.passwordSubmitted = false;
    if (tab === 'apikeys') {
      this.loadApiKeys();
    }
  }

  get fullName() { return this.profileForm.get('fullName'); }
  get currentPassword() { return this.changePasswordForm.get('currentPassword'); }
  get newPassword() { return this.changePasswordForm.get('newPassword'); }
  get confirmPassword() { return this.changePasswordForm.get('confirmPassword'); }
}
