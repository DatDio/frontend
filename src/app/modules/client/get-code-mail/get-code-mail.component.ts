import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { HotmailService } from '../../../core/services/hotmail.service';
import { NotificationService } from '../../../core/services/notification.service';
import { HotmailGetCodeResponse, EMAIL_TYPES, GET_TYPES, EmailType } from '../../../core/models/hotmail.model';

@Component({
  selector: 'app-get-code-mail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './get-code-mail.component.html',
  styleUrls: ['./get-code-mail.component.scss']
})
export class GetCodeMailComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly hotmailService = inject(HotmailService);
  private readonly notificationService = inject(NotificationService);

  getCodeForm!: FormGroup;
  emailTypes = EMAIL_TYPES;
  getTypes = GET_TYPES;
  getCodeLoading = false;
  getCodeResults: HotmailGetCodeResponse[] = [];
  showGetCodeResults = false;

  // Multi-select state for get types (Graph API, Oauth2)
  selectedGetTypes: Set<string> = new Set(['Oauth2']);

  // Multi-select state for email types
  selectedEmailTypes: Set<string> = new Set(['Auto']);

  ngOnInit(): void {
    this.initGetCodeForm();
  }

  private initGetCodeForm(): void {
    this.getCodeForm = this.formBuilder.group({
      emailData: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  // Toggle Get Type (Graph API, Oauth2)
  toggleGetType(type: string): void {
    if (this.selectedGetTypes.has(type)) {
      // Don't allow deselecting if it's the only one selected
      if (this.selectedGetTypes.size > 1) {
        this.selectedGetTypes.delete(type);
      }
    } else {
      this.selectedGetTypes.add(type);
    }
  }

  isGetTypeSelected(type: string): boolean {
    return this.selectedGetTypes.has(type);
  }

  // Toggle Email Type with Auto select/deselect all logic
  toggleEmailType(type: EmailType): void {
    if (type === 'Auto') {
      // If Auto is being selected, select all. If Auto is being deselected, deselect all except the first one
      if (this.selectedEmailTypes.has('Auto')) {
        // Deselecting Auto - clear all and keep only the first non-Auto type
        this.selectedEmailTypes.clear();
        this.selectedEmailTypes.add(this.emailTypes[1]); // First non-Auto type
      } else {
        // Selecting Auto - select all email types
        this.selectedEmailTypes.clear();
        this.emailTypes.forEach(emailType => this.selectedEmailTypes.add(emailType));
      }
    } else {
      if (this.selectedEmailTypes.has(type)) {
        // Don't allow deselecting if it's the only one selected
        if (this.selectedEmailTypes.size > 1) {
          this.selectedEmailTypes.delete(type);
          // If Auto was selected and we're deselecting something else, also deselect Auto
          if (this.selectedEmailTypes.has('Auto')) {
            this.selectedEmailTypes.delete('Auto');
          }
        }
      } else {
        this.selectedEmailTypes.add(type);
        // Check if all non-Auto types are selected, then also select Auto
        const allNonAutoSelected = this.emailTypes.filter(t => t !== 'Auto').every(t => this.selectedEmailTypes.has(t));
        if (allNonAutoSelected) {
          this.selectedEmailTypes.add('Auto');
        }
      }
    }
  }

  isEmailTypeSelected(type: EmailType): boolean {
    return this.selectedEmailTypes.has(type);
  }

  get emailCount(): number {
    const emailData = this.getCodeForm.get('emailData')?.value || '';
    const lines = emailData.trim().split('\n').filter((line: string) => line.trim().length > 0);
    return lines.length;
  }

  onGetCode(): void {
    if (this.getCodeForm.invalid) {
      this.notificationService.warning('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (this.selectedGetTypes.size === 0) {
      this.notificationService.warning('Vui lòng chọn ít nhất một Type Get');
      return;
    }

    if (this.selectedEmailTypes.size === 0) {
      this.notificationService.warning('Vui lòng chọn ít nhất một loại email');
      return;
    }

    this.getCodeLoading = true;
    this.showGetCodeResults = false;
    this.getCodeResults = [];

    const request = {
      getTypes: Array.from(this.selectedGetTypes),
      emailTypes: Array.from(this.selectedEmailTypes),
      emailData: this.getCodeForm.get('emailData')?.value.trim()
    };

    this.hotmailService.getCode(request)
      .pipe(finalize(() => this.getCodeLoading = false))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.getCodeResults = response.data || [];
            this.showGetCodeResults = true;
            if (this.getCodeResults.length === 0) {
              this.notificationService.info('Không tìm thấy mã xác thực nào');
            } else {
              const successCount = this.getCodeResults.filter(r => r.status).length;
              this.notificationService.success(`Tìm thấy ${successCount}/${this.getCodeResults.length} mã xác thực`);
            }
          } else {
            this.notificationService.error(response.message || 'Không thể lấy mã xác thực');
          }
        },
        error: (error) => {
          this.notificationService.error(error.error?.message || 'Đã xảy ra lỗi khi lấy mã');
        }
      });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.notificationService.success('Đã sao chép mã!');
    }).catch(() => {
      this.notificationService.error('Không thể sao chép');
    });
  }

  retryGetCode(result: HotmailGetCodeResponse): void {
    // Re-run get code for this specific email
    this.notificationService.info(`Đang thử lại cho ${result.email}...`);
    // This would need backend support for single-email retry
  }

  clearGetCodeResults(): void {
    this.getCodeResults = [];
    this.showGetCodeResults = false;
  }
}

