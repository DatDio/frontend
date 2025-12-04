import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { HotmailService } from '../../../core/services/hotmail.service';
import { NotificationService } from '../../../core/services/notification.service';
import { HotmailGetCodeResponse, EMAIL_TYPES, GET_TYPES } from '../../../core/models/hotmail.model';

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

  ngOnInit(): void {
    this.initGetCodeForm();
  }

  private initGetCodeForm(): void {
    this.getCodeForm = this.formBuilder.group({
      getType: ['Oauth2', Validators.required],
      emailType: ['Auto', Validators.required],
      emailData: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onGetCode(): void {
    if (this.getCodeForm.invalid) {
      this.notificationService.warning('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    this.getCodeLoading = true;
    this.showGetCodeResults = false;
    this.getCodeResults = [];

    const request = {
      getType: this.getCodeForm.get('getType')?.value,
      emailType: this.getCodeForm.get('emailType')?.value,
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
              this.notificationService.success(`Tìm thấy ${this.getCodeResults.length} mã xác thực`);
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

  clearGetCodeResults(): void {
    this.getCodeResults = [];
    this.showGetCodeResults = false;
  }
}
