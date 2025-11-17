import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { SeoService } from '../../../core/services/seo.service';

interface DashboardStats {
  totalUsers: number;
  totalAccounts: number;
  activeAccounts: number;
  revenue: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    totalUsers: 0,
    totalAccounts: 0,
    activeAccounts: 0,
    revenue: 0
  };
  loading = true;

  recentActivities = [
    { type: 'user', message: 'New user registered: john@example.com', time: '5 minutes ago' },
    { type: 'account', message: 'Mail account added: premium@gmail.com', time: '12 minutes ago' },
    { type: 'sale', message: 'Account sold: business@outlook.com', time: '1 hour ago' }
  ];

  constructor(
    private apiService: ApiService,
    private seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.seoService.setTitle('Admin Dashboard - MailShop');
    this.loadStats();
  }

  loadStats(): void {
    this.apiService.get<any>('/admin/stats').subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
