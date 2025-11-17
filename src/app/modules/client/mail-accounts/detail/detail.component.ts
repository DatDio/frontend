import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { MailAccount } from '../../../../core/models/mail-account.model';
import { ApiResponse } from '../../../../core/models/api-response.model';

@Component({
  selector: 'app-mail-account-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class MailAccountDetailComponent implements OnInit {
  account: MailAccount | null = null;
  loading = true;
  showPassword = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAccount(id);
    }
  }

  loadAccount(id: string): void {
    this.loading = true;
    this.apiService.get<ApiResponse<MailAccount>>(`/mail-accounts/${id}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.account = response.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
