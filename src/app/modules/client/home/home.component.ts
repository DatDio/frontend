import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../shared/services/pagination.service';
import { Category } from '../../../core/models/category.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginationComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly categoryService = inject(CategoryService);
  private readonly notificationService = inject(NotificationService);
  private readonly paginationService = inject(PaginationService);

  categories: Category[] = [];
  paginationConfig: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };

  services = [
    {
      id: 1,
      name: 'Check Mail',
      icon: 'check-circle',
      color: 'blue',
      rating: '4.8/5'
    },
    {
      id: 2,
      name: 'Biết Code',
      icon: 'code',
      color: 'yellow',
      rating: '4.9/5'
    },
    {
      id: 3,
      name: 'Đơc khoá thư',
      icon: 'unlock',
      color: 'purple',
      rating: '4.7/5'
    },
    {
      id: 4,
      name: 'Dùng Lý phần',
      icon: 'mobile-alt',
      color: 'teal',
      rating: '4.8/5'
    },
    {
      id: 5,
      name: 'Giải 24h',
      icon: 'clock',
      color: 'green',
      rating: '4.9/5'
    },
    {
      id: 6,
      name: 'Dùng Lý Homiball',
      icon: 'star',
      color: 'purple',
      rating: '4.8/5'
    },
    {
      id: 7,
      name: 'Unlock Homiball',
      icon: 'lock-open',
      color: 'orange',
      rating: '4.9/5'
    },
    {
      id: 8,
      name: 'Dùng Lý yellow',
      icon: 'star',
      color: 'green',
      rating: '4.8/5'
    }
  ];


  constructor() { }

  ngOnInit(): void {

    this.seoService.setTitle('MailShop - Chuyên cung cấp tài nguyên marketing');
    this.seoService.setMetaDescription('Cung cấp tài khoản email uy tín, chất lượng cao cho marketing, quảng cáo.');
    this.seoService.setOpenGraph({
      title: 'MailShop - Cung cấp tài nguyên',
      description: 'Marketplace tài khoản email marketing',
      image: '/assets/images/og-home.jpg',
      url: 'https://mailshop.com'
    });
    this.loadCategories();

  }

  loadCategories(): void {
    this.categoryService.list({ 
      page: this.paginationConfig.currentPage, 
      limit: this.paginationConfig.pageSize 
    }).subscribe({
      next: res => {
        if (res.success && res.data?.content) {
          this.categories = res.data.content;
          // Lấy pagination info từ backend trực tiếp
          const paginationInfo = this.paginationService.extractPaginationInfo(res.data);
          this.paginationConfig = {
            currentPage: paginationInfo.currentPage,
            pageSize: paginationInfo.pageSize,
            totalElements: paginationInfo.totalElements,
            totalPages: paginationInfo.totalPages
          };
        }
      },
      error: err => {
        this.notificationService.error('Error', err.error?.message || 'Failed to load categories');
      }
    });
  }

  onPageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.loadCategories();
  }

  onPageSizeChange(size: number): void {
    this.paginationConfig.pageSize = size;
    this.paginationConfig.currentPage = 0;
    this.loadCategories();
  }
}
