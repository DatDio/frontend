import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../../core/services/seo.service';
import { MailAccountService } from '../../../../core/services/mail-account.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MailAccount, MailAccountStatus } from '../../../../core/models/mail-account.model';
import { ApiResponse } from '../../../../core/models/common.model';

@Component({
  selector: 'app-mail-account-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class MailAccountListComponent implements OnInit {
  accounts: MailAccount[] = [];
  loading = true;
  MailAccountStatus = MailAccountStatus;

  readonly mailAccountService = inject(MailAccountService);
  readonly seoService = inject(SeoService);
  readonly notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.seoService.setPageMeta(
      'My Mail Accounts - MailShop',
      'Manage your mail accounts in one place',
      'mail accounts, email management'
    );
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading = true;

    this.mailAccountService.list().subscribe({
      next: (response) => {
        if (response.success) {
          this.accounts = response.data.content || response.data as any;
          this.notificationService.success('Success', 'Mail accounts loaded successfully');
        } else {
          this.notificationService.error('Error', response.message || 'Failed to load accounts');
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error('Error', error.error?.message || 'Failed to load accounts');
        this.loading = false;
      }
    });
  }

  // deleteAccount(id: string): void {
  //   if (confirm('Are you sure you want to delete this account?')) {
  //     this.apiService.delete<ApiResponse<void>>(`/mail-accounts/${id}`).subscribe({
  //       next: (response) => {
  //         if (response.success) {
  //           this.loadAccounts();
  //         }
  //       }
  //     });
  //   }
  // }

  getStatusClass(status: MailAccountStatus): string {
    switch (status) {
      case MailAccountStatus.ACTIVE:
        return 'badge bg-success';
      case MailAccountStatus.INACTIVE:
        return 'badge bg-secondary';
      case MailAccountStatus.SOLD:
        return 'badge bg-warning';
      default:
        return 'badge bg-secondary';
    }
  }
}
