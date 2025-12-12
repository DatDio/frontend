import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { SeoService } from '../../../core/services/seo.service';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';
import { OrderService } from '../../../core/services/order.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { PaginationService } from '../../../shared/services/pagination.service';
import { WebSocketService } from '../../../core/services/websocket.service';

import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { OrderCreate } from '../../../core/models/order.model';
import { ProductQuantityMessage } from '../../../core/models/product-quantity-message.model';
import { TransactionService } from '../../../core/services/wallet.service';
import { environment } from '../../../../environments/environment';

declare var bootstrap: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginationComponent, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly seoService = inject(SeoService);
  private readonly categoryService = inject(CategoryService);
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly paginationService = inject(PaginationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(TransactionService);
  private readonly router = inject(Router);
  private readonly webSocketService = inject(WebSocketService);

  categories: Category[] = [];
  paginationConfig: PaginationConfig = {
    currentPage: 0,
    totalPages: 1,
    pageSize: 10,
    totalElements: 0
  };

  orderForm!: FormGroup;
  selectedProduct: Product | null = null;
  orderLoading = false;
  private modalInstance: any;
  private productQuantityUnsub?: () => void;
  private latestQuantities = new Map<number, number>();

  constructor() {
    // loadCategories() is called in ngOnInit() for SSR support
  }

  ngOnInit(): void {
    this.seoService.setTitle('MailShop - Chuyên cung cấp tài nguyên marketing');
    this.initOrderForm();
    this.loadCategories();
    this.subscribeToQuantityUpdates();
  }

  ngOnDestroy(): void {
    this.productQuantityUnsub?.();
  }

  private initOrderForm(): void {
    this.orderForm = this.formBuilder.group({
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(1000)]]
    });
  }

  loadCategories(): void {
    this.categoryService.list({
      page: this.paginationConfig.currentPage,
      limit: this.paginationConfig.pageSize,
      status: '1'
    }).subscribe({
      next: res => {
        if (res.success && res.data?.content) {
          this.categories = res.data.content;
          const paginationInfo = this.paginationService.extractPaginationInfo(res.data);
          this.paginationConfig = { ...this.paginationConfig, ...paginationInfo };
          this.applyBufferedQuantities();
        }
      },
      error: () => this.notificationService.error('Không thể tải danh sách sản phẩm')
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

  // --- LOGIC MODAL & MUA HANG ---

  prepareOrder(product: Product): void {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.warning('Vui lòng đăng nhập để mua hàng');
      return;
    }

    this.selectedProduct = product;
    this.orderForm.patchValue({ quantity: 1 });

    const modalElement = document.getElementById('orderModal');
    if (modalElement) {
      this.modalInstance = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalInstance.show();
    }
  }

  onSubmitOrder(): void {
    if (this.orderForm.invalid || !this.selectedProduct) return;

    this.orderLoading = true;
    const quantity = this.orderForm.get('quantity')?.value;

    const orderRequest: OrderCreate = {
      productId: this.selectedProduct.id,
      quantity: quantity
    };

    this.orderService.buy(orderRequest)
      .pipe(finalize(() => this.orderLoading = false))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Đặt hàng thành công!');
            this.closeOrderModal();
            this.walletService.refreshBalance();
            this.router.navigate(['/orders']);
          } else {
            this.notificationService.error(response.message || 'Đặt hàng thất bại');
          }
        },
        error: (error) => {
          this.notificationService.error(error.error?.message || 'Đã xảy ra lỗi hệ thống');
        }
      });
  }

  closeOrderModal(): void {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }

    const backdrops = document.getElementsByClassName('modal-backdrop');
    while (backdrops.length > 0) {
      backdrops[0].parentNode?.removeChild(backdrops[0]);
    }
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    setTimeout(() => {
      this.selectedProduct = null;
      this.orderForm.reset({ quantity: 1 });
    }, 200);
  }

  get totalPrice(): number {
    if (!this.selectedProduct) return 0;
    const quantity = this.orderForm.get('quantity')?.value || 0;
    return this.selectedProduct.price * quantity;
  }

  private subscribeToQuantityUpdates(): void {
    this.productQuantityUnsub = this.webSocketService.subscribe<ProductQuantityMessage>(
      '/topic/product-quantity',
      (payload) => this.handleQuantityUpdate(payload)
    );
  }

  private handleQuantityUpdate(update: ProductQuantityMessage): void {
    if (!update?.productId) {
      return;
    }

    this.latestQuantities.set(update.productId, update.quantity);
    this.categories = this.categories.map(category => ({
      ...category,
      products: category.products.map(product =>
        product.id === update.productId ? { ...product, quantity: update.quantity } : product
      )
    }));
  }

  private applyBufferedQuantities(): void {
    if (this.latestQuantities.size === 0) {
      return;
    }

    this.categories = this.categories.map(category => ({
      ...category,
      products: category.products.map(product => {
        const latest = this.latestQuantities.get(product.id);
        return latest != null ? { ...product, quantity: latest } : product;
      })
    }));
  }

  getFullImageUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    return `${environment.apiBaseUrl}${relativePath}`;
  }
}