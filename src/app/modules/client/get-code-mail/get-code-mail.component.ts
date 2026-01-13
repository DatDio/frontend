import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../core/services/notification.service';
import { SeoService } from '../../../core/services/seo.service';
import { MicrosoftGraphService, EmailCodeResult } from '../../../core/services/microsoft-graph.service';
import { EMAIL_TYPES, GET_TYPES, EmailType, CheckStatus } from '../../../core/models/hotmail.model';

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
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './get-code-mail.component.html',
  styleUrls: ['./get-code-mail.component.scss']
})
export class GetCodeMailComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly seoService = inject(SeoService);
  private readonly translateService = inject(TranslateService);
  private readonly graphService = inject(MicrosoftGraphService);

  getCodeForm!: FormGroup;
  emailTypes = EMAIL_TYPES;
  getTypes = GET_TYPES;
  isLoading = false;
  showResults = false;
  isStopped = false;

  // Copy state tracking
  copiedCode: string | null = null;
  private copyTimeout: any;

  selectedGetTypes: Set<string> = new Set(['Oauth2']);
  selectedEmailTypes: Set<string> = new Set(['Auto']);

  successResults: CodeResult[] = [];
  failedResults: CodeResult[] = [];
  unknownResults: CodeResult[] = [];
  totalCount = 0;
  processedCount = 0;

  // Concurrency control
  private readonly MAX_CONCURRENT = 10;
  private readonly DEFAULT_CLIENT_ID = '9e5f94bc-e8a4-4e73-b8be-63364c29d753';

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'Lấy Mã Xác Thực Email - EmailSieuRe',
      'Công cụ lấy mã xác thực OTP từ email Hotmail/Outlook nhanh chóng và tự động. Hỗ trợ nhiều định dạng email khác nhau.',
      'get code mail, lấy mã xác thực, OTP, Hotmail, Outlook, email verification'
    );
    this.getCodeForm = this.formBuilder.group({
      emailData: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
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

  /**
   * Main entry point - process emails using frontend Graph API
   */
  async onGetCode(): Promise<void> {
    if (this.getCodeForm.invalid || this.selectedGetTypes.size === 0 || this.selectedEmailTypes.size === 0) {
      this.notificationService.warning(this.translateService.instant('TOOLS.FILL_INFO'));
      return;
    }

    // Reset state
    this.successResults = [];
    this.failedResults = [];
    this.unknownResults = [];
    this.processedCount = 0;
    this.isLoading = true;
    this.showResults = true;
    this.isStopped = false;

    const emailData = this.getCodeForm.get('emailData')?.value.trim();
    const emailLines = emailData.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    this.totalCount = emailLines.length;
    const emailTypes = Array.from(this.selectedEmailTypes);

    // Process emails with concurrency control
    await this.processEmailsConcurrently(emailLines, emailTypes);

    this.isLoading = false;
    this.notificationService.success(
      `${this.translateService.instant('TOOLS.COMPLETED')}: ${this.successCount} success, ${this.failedCount} failed, ${this.unknownCount} unknown`
    );
  }

  /**
   * Process emails with concurrency limit using Promise-based queue
   */
  private async processEmailsConcurrently(emailLines: string[], emailTypes: string[]): Promise<void> {
    const queue = [...emailLines];
    let activeCount = 0;
    const maxConcurrent = this.MAX_CONCURRENT;

    const processNext = async (): Promise<void> => {
      while (queue.length > 0 && !this.isStopped) {
        if (activeCount >= maxConcurrent) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        const line = queue.shift();
        if (!line) break;

        activeCount++;
        this.processSingleEmail(line, emailTypes).finally(() => {
          activeCount--;
        });
      }
    };

    // Start concurrent processing
    const workers = [];
    for (let i = 0; i < maxConcurrent; i++) {
      workers.push(processNext());
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    // Wait for remaining active tasks
    while (activeCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Process a single email line
   */
  private async processSingleEmail(line: string, emailTypes: string[]): Promise<void> {
    const parts = line.split('|');

    if (parts.length < 3) {
      this.handleResult({
        email: parts[0] || line,
        password: parts[1] || '',
        status: 'FAILED',
        content: 'Invalid format: requires email|password|refresh_token|client_id'
      });
      return;
    }

    const email = parts[0].trim();
    const password = parts[1].trim();
    const refreshToken = parts[2].trim();
    const clientId = parts.length > 3 && parts[3].trim() ? parts[3].trim() : this.DEFAULT_CLIENT_ID;

    try {
      const result = await this.graphService.getCode(
        email, password, refreshToken, clientId, emailTypes
      ).toPromise();

      if (result) {
        this.handleResult(result);
      }
    } catch (error: any) {
      this.handleResult({
        email,
        password,
        refreshToken,
        clientId,
        status: 'UNKNOWN',
        content: `Error: ${error.message}`
      });
    }
  }

  /**
   * Handle result from Graph API processing
   */
  private handleResult(result: EmailCodeResult): void {
    this.processedCount++;

    const codeResult: CodeResult = {
      email: result.email,
      password: result.password,
      refreshToken: result.refreshToken,
      clientId: result.clientId,
      code: result.code,
      content: result.content,
      date: result.date,
      status: result.status
    };

    if (result.status === 'SUCCESS') {
      this.successResults = [...this.successResults, codeResult];
    } else if (result.status === 'FAILED') {
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
      this.notificationService.success(this.translateService.instant('TOOLS.COPIED'));
      this.copyTimeout = setTimeout(() => {
        this.copiedCode = null;
      }, 2000);
    });
  }

  copySuccess(): void {
    const data = this.successResults.map(r => `${r.email}|${r.code}`).join('\n');
    if (!data) { this.notificationService.warning(this.translateService.instant('TOOLS.NO_DATA')); return; }
    navigator.clipboard.writeText(data).then(() => this.notificationService.success(this.translateService.instant('TOOLS.COPIED_RESULTS', { count: this.successCount })));
  }

  copyFailed(): void {
    const data = this.failedResults.map(r => `${r.email}|${r.password || ''}`).join('\n');
    if (!data) { this.notificationService.warning(this.translateService.instant('TOOLS.NO_DATA')); return; }
    navigator.clipboard.writeText(data).then(() => this.notificationService.success(this.translateService.instant('TOOLS.COPIED_EMAILS', { count: this.failedCount })));
  }

  copyUnknown(): void {
    const data = this.unknownResults.map(r => `${r.email}|${r.password || ''}`).join('\n');
    if (!data) { this.notificationService.warning(this.translateService.instant('TOOLS.NO_DATA')); return; }
    navigator.clipboard.writeText(data).then(() => this.notificationService.success(this.translateService.instant('TOOLS.COPIED_EMAILS', { count: this.unknownCount })));
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
    this.isStopped = true;
    this.isLoading = false;
    this.notificationService.info(this.translateService.instant('TOOLS.STOPPED'));
  }

  /**
   * Retry a single failed email
   */
  async retryRow(item: CodeResult): Promise<void> {
    if (!item.refreshToken) {
      this.notificationService.error('Missing refresh token for retry');
      return;
    }

    item.retrying = true;
    const emailTypes = Array.from(this.selectedEmailTypes);

    try {
      const result = await this.graphService.getCode(
        item.email,
        item.password || '',
        item.refreshToken,
        item.clientId || this.DEFAULT_CLIENT_ID,
        emailTypes
      ).toPromise();

      if (result) {
        this.updateRetryResult(item, result);
      }
    } catch (error: any) {
      item.retrying = false;
      this.notificationService.error('Retry failed: ' + error.message);
    }
  }

  private updateRetryResult(originalItem: CodeResult, result: EmailCodeResult): void {
    // Remove from old arrays
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
      status: result.status,
      retrying: false
    };

    // Add to appropriate array
    if (result.status === 'SUCCESS') {
      this.successResults = [...this.successResults, updatedResult];
      this.notificationService.success(`${result.email}: ${this.translateService.instant('COMMON.SUCCESS')}!`);
    } else if (result.status === 'FAILED') {
      this.failedResults = [...this.failedResults, updatedResult];
    } else {
      this.unknownResults = [...this.unknownResults, updatedResult];
    }
  }
}
