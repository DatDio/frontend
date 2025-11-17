import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { SeoService } from '../../../../core/services/seo.service';
import { MailAccount, MailAccountStatus } from '../../../../core/models/mail-account.model';
import { ApiResponse } from '../../../../core/models/api-response.model';

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

  constructor(
    private apiService: ApiService,
    private seoService: SeoService
  ) {}

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
    this.apiService.get<ApiResponse<MailAccount[]>>('/mail-accounts/my').subscribe({
      next: (response) => {
        if (response.success) {
          this.accounts = response.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  deleteAccount(id: string): void {
    if (confirm('Are you sure you want to delete this account?')) {
      this.apiService.delete<ApiResponse<void>>(`/mail-accounts/${id}`).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadAccounts();
          }
        }
      });
    }
  }

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
