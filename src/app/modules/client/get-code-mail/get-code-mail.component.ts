import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { HotmailGetCodeResponse, EMAIL_TYPES, GET_TYPES, EmailType, CheckStatus } from '../../../core/models/hotmail.model';
import { HotmailApi } from '../../../Utils/apis/hotmail/hotmail.api';

interface CodeResult {
  email: string;
  password?: string;
  refreshToken?: string;
  clientId?: string;
  code?: string;
  content?: string;
  date?: string;
  status: CheckStatus;
  retrying?: boolean;
}

@Component({
  selector: 'app-get-code-mail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './get-code-mail.component.html',
  styleUrls: ['./get-code-mail.component.scss']
})
export class GetCodeMailComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly seoService = inject(SeoService);

  getCodeForm!: FormGroup;
  emailTypes = EMAIL_TYPES;
  getTypes = GET_TYPES;
  isLoading = false;
  showResults = false;

  // Copy state tracking
  copiedCode: string | null = null;
  private copyTimeout: any;

  private eventSource: EventSource | null = null;

  selectedGetTypes: Set<string> = new Set(['Oauth2']);
  selectedEmailTypes: Set<string> = new Set(['Auto']);

  successResults: CodeResult[] = [];
  failedResults: CodeResult[] = [];
  unknownResults: CodeResult[] = [];
  totalCount = 0;
  processedCount = 0;

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Lấy Mã Xác Thực Email - MailShop',
      'Công cụ lấy mã xác thực OTP từ email Hotmail/Outlook nhanh chóng và tự động. Hỗ trợ nhiều định dạng email khác nhau.',
      'get code mail, lấy mã xác thực, OTP, Hotmail, Outlook, email verification'
    );
    this.getCodeForm = this.formBuilder.group({
      emailData: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnDestroy(): void {
    this.closeEventSource();
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }

  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  toggleGetType(type: string): void {
    if (this.selectedGetTypes.has(type)) {
      if (this.selectedGetTypes.size > 1) this.selectedGetTypes.delete(type);
    } else {
      this.selectedGetTypes.add(type);
    }
  }

  isGetTypeSelected(type: string): boolean {
    return this.selectedGetTypes.has(type);
  }

  toggleEmailType(type: EmailType): void {
    if (type === 'Auto') {
      if (this.selectedEmailTypes.has('Auto')) {
        this.selectedEmailTypes.clear();
        this.selectedEmailTypes.add(this.emailTypes[1]);
      } else {
        this.selectedEmailTypes.clear();
        this.emailTypes.forEach(t => this.selectedEmailTypes.add(t));
      }
    } else {
      if (this.selectedEmailTypes.has(type)) {
        if (this.selectedEmailTypes.size > 1) {
          this.selectedEmailTypes.delete(type);
          this.selectedEmailTypes.delete('Auto');
        }
      } else {
        this.selectedEmailTypes.add(type);
        if (this.emailTypes.filter(t => t !== 'Auto').every(t => this.selectedEmailTypes.has(t))) {
          this.selectedEmailTypes.add('Auto');
        }
      }
    }
  }

  isEmailTypeSelected(type: EmailType): boolean {
    return this.selectedEmailTypes.has(type);
  }

  get emailCount(): number {
    const data = this.getCodeForm.get('emailData')?.value || '';
    return data.trim().split('\n').filter((line: string) => line.trim().length > 0).length;
  }

  get successCount(): number { return this.successResults.length; }
  get failedCount(): number { return this.failedResults.length; }
  get unknownCount(): number { return this.unknownResults.length; }
  get progressPercent(): number {
    return this.totalCount > 0 ? Math.round((this.processedCount / this.totalCount) * 100) : 0;
  }
  get allResults(): CodeResult[] {
    return [...this.successResults, ...this.failedResults, ...this.unknownResults];
  }

  onGetCode(): void {
    if (this.getCodeForm.invalid || this.selectedGetTypes.size === 0 || this.selectedEmailTypes.size === 0) {
      this.notificationService.warning('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    this.successResults = [];
    this.failedResults = [];
    this.unknownResults = [];
    this.processedCount = 0;
    this.isLoading = true;
    this.showResults = true;
    this.closeEventSource();

    const emailData = this.getCodeForm.get('emailData')?.value.trim();
    this.totalCount = emailData.split('\n').filter((line: string) => line.trim().length > 0).length;

    const request = {
      getTypes: Array.from(this.selectedGetTypes),
      emailTypes: Array.from(this.selectedEmailTypes),
      emailData
    };

    fetch(HotmailApi.GET_CODE_START, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data?.sessionId) {
          this.connectToStream(result.data.sessionId);
        } else {
          throw new Error(result.message || 'Failed to create session');
        }
      })
      .catch(error => {
        this.isLoading = false;
        this.notificationService.error('Lỗi: ' + error.message);
      });
  }

  private connectToStream(sessionId: string): void {
    const url = `${HotmailApi.GET_CODE_STREAM}?sessionId=${sessionId}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const result: HotmailGetCodeResponse = JSON.parse(event.data);
        this.handleResult(result);
      } catch (e) { }
    };

    this.eventSource.addEventListener('result', (event: any) => {
      try {
        const result: HotmailGetCodeResponse = JSON.parse(event.data);
        this.handleResult(result);
      } catch (e) { }
    });

    this.eventSource.addEventListener('done', () => {
      this.closeEventSource();
      this.isLoading = false;
      this.notificationService.success(
        `Hoàn thành: ${this.successCount} success, ${this.failedCount} failed, ${this.unknownCount} unknown`
      );
    });

    this.eventSource.onerror = () => {
      this.closeEventSource();
      this.isLoading = false;
    };
  }

  private handleResult(result: HotmailGetCodeResponse): void {
    this.processedCount++;
    const codeResult: CodeResult = {
      email: result.email,
      password: result.password,
      refreshToken: result.refreshToken,
      clientId: result.clientId,
      code: result.code,
      content: result.content,
      date: result.date,
      status: result.checkStatus || (result.status ? 'SUCCESS' : 'FAILED')
    };

    if (codeResult.status === 'SUCCESS') {
      this.successResults = [...this.successResults, codeResult];
    } else if (codeResult.status === 'FAILED') {
      this.failedResults = [...this.failedResults, codeResult];
    } else {
      this.unknownResults = [...this.unknownResults, codeResult];
    }
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      this.copiedCode = code;
      this.notificationService.success('Đã copy mã!');
      this.copyTimeout = setTimeout(() => {
        this.copiedCode = null;
      }, 2000);
    });
  }

  copySuccess(): void {
    const data = this.successResults.map(r => `${r.email}|${r.code}`).join('\n');
    if (!data) { this.notificationService.warning('Không có dữ liệu'); return; }
    navigator.clipboard.writeText(data).then(() => this.notificationService.success(`Đã copy ${this.successCount} kết quả!`));
  }

  copyFailed(): void {
    const data = this.failedResults.map(r => `${r.email}|${r.password || ''}`).join('\n');
    if (!data) { this.notificationService.warning('Không có dữ liệu'); return; }
    navigator.clipboard.writeText(data).then(() => this.notificationService.success(`Đã copy ${this.failedCount} email!`));
  }

  copyUnknown(): void {
    const data = this.unknownResults.map(r => `${r.email}|${r.password || ''}`).join('\n');
    if (!data) { this.notificationService.warning('Không có dữ liệu'); return; }
    navigator.clipboard.writeText(data).then(() => this.notificationService.success(`Đã copy ${this.unknownCount} email!`));
  }

  clearResults(): void {
    this.successResults = [];
    this.failedResults = [];
    this.unknownResults = [];
    this.processedCount = 0;
    this.totalCount = 0;
    this.showResults = false;
  }

  stopGetCode(): void {
    this.closeEventSource();
    this.isLoading = false;
    this.notificationService.info('Đã dừng lấy mã');
  }

  retryRow(item: CodeResult): void {
    item.retrying = true;
    const emailData = `${item.email}|${item.password || ''}|${item.refreshToken || ''}|${item.clientId || ''}`;

    const request = {
      getTypes: Array.from(this.selectedGetTypes),
      emailTypes: Array.from(this.selectedEmailTypes),
      emailData
    };

    fetch(HotmailApi.GET_CODE_START, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data?.sessionId) {
          this.retryStream(result.data.sessionId, item);
        } else {
          item.retrying = false;
          this.notificationService.error('Retry failed');
        }
      })
      .catch(() => {
        item.retrying = false;
        this.notificationService.error('Retry failed');
      });
  }

  private retryStream(sessionId: string, originalItem: CodeResult): void {
    const eventSource = new EventSource(`${HotmailApi.GET_CODE_STREAM}?sessionId=${sessionId}`);

    eventSource.addEventListener('result', (event: any) => {
      try {
        const result: HotmailGetCodeResponse = JSON.parse(event.data);
        this.updateRetryResult(originalItem, result);
      } catch (e) { }
    });

    eventSource.addEventListener('done', () => {
      eventSource.close();
      originalItem.retrying = false;
    });

    eventSource.onerror = () => {
      eventSource.close();
      originalItem.retrying = false;
    };
  }

  private updateRetryResult(originalItem: CodeResult, result: HotmailGetCodeResponse): void {
    const newStatus = result.checkStatus || (result.status ? 'SUCCESS' : 'FAILED');

    // Remove from old array
    this.successResults = this.successResults.filter(r => r !== originalItem);
    this.failedResults = this.failedResults.filter(r => r !== originalItem);
    this.unknownResults = this.unknownResults.filter(r => r !== originalItem);

    // Create updated result
    const updatedResult: CodeResult = {
      email: result.email,
      password: result.password,
      refreshToken: result.refreshToken,
      clientId: result.clientId,
      code: result.code,
      content: result.content,
      date: result.date,
      status: newStatus,
      retrying: false
    };

    // Add to new array
    if (newStatus === 'SUCCESS') {
      this.successResults = [...this.successResults, updatedResult];
      this.notificationService.success(`${result.email}: Thành công!`);
    } else if (newStatus === 'FAILED') {
      this.failedResults = [...this.failedResults, updatedResult];
    } else {
      this.unknownResults = [...this.unknownResults, updatedResult];
    }
  }
}
