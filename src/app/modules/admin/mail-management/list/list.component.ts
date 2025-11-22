import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../core/models/product.model';
import { ProductService } from '../../../../core/services/product.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-mail-management-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class MailManagementListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  products: Product[] = [];
  searchName = '';

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService
      .list({
        page: 0,
        limit: 20,
        sort: 'id,desc',
        name: this.searchName || undefined
      })
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data?.content) {
            this.products = response.data.content;
          }
        },
        error: (error: any) => {
          console.error('Error loading products:', error);
          this.notificationService.error('Lỗi', 'Lỗi khi tải danh sách sản phẩm');
        }
      });
  }

  onSearch(): void {
    this.loadProducts();
  }

  onDetail(productId: number): void {
    this.router.navigate(['/admin/mail-management', productId, 'items']);
  }
}
