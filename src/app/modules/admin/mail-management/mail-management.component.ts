import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MailAccountService } from '../../../core/services/mail-account.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MailAccount, MailAccountStatus, MailProvider } from '../../../core/models/mail-account.model';

@Component({
  selector: 'app-mail-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mail-management.component.html',
  styleUrls: ['./mail-management.component.scss']
})
export class MailManagementComponent implements OnInit {
  accounts: MailAccount[] = [];
  loading = true;
  searchTerm = '';
  selectedAccounts: Set<string> = new Set();
  MailAccountStatus = MailAccountStatus;

  constructor(
    private mailAccountService: MailAccountService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
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

  toggleSelect(id: string): void {
    if (this.selectedAccounts.has(id)) {
      this.selectedAccounts.delete(id);
    } else {
      this.selectedAccounts.add(id);
    }
  }

  selectAll(): void {
    if (this.selectedAccounts.size === this.accounts.length) {
      this.selectedAccounts.clear();
    } else {
      this.accounts.forEach(account => this.selectedAccounts.add(account.id));
    }
  }

  bulkUpdateStatus(status: MailAccountStatus): void {
    if (this.selectedAccounts.size === 0) {
      this.notificationService.warning('Warning', 'Please select accounts first');
      return;
    }

    const ids = Array.from(this.selectedAccounts);
    this.mailAccountService.bulkUpdateStatus({ ids, status }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Success', 'Status updated successfully');
          this.selectedAccounts.clear();
          this.loadAccounts();
        } else {
          this.notificationService.error('Error', response.message || 'Failed to update status');
        }
      },
      error: (error) => {
        this.notificationService.error('Error', error.error?.message || 'Failed to update status');
      }
    });
  }

  exportCSV(): void {
    this.mailAccountService.exportExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mail-accounts-${new Date().getTime()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.notificationService.success('Success', 'Export completed successfully');
      },
      error: (error) => {
        this.notificationService.error('Error', 'Failed to export data');
      }
    });
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

  deleteAccount(id: string): void {
    if (confirm('Are you sure you want to delete this account?')) {
      this.mailAccountService.delete([id]).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Success', 'Account deleted successfully');
            this.loadAccounts();
          } else {
            this.notificationService.error('Error', response.message || 'Failed to delete account');
          }
        },
        error: (error) => {
          this.notificationService.error('Error', error.error?.message || 'Failed to delete account');
        }
      });
    }
  }
}
