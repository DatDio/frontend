import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExternalApiService, ExternalApiProvider, ExternalProduct, ExternalProductMapping } from '../../../../../core/services/external-api.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { Category } from '../../../../../core/models/category.model';

@Component({
    selector: 'app-external-product-mapping-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './create-modal.component.html',
    styleUrl: './create-modal.component.scss'
})
export class ExternalProductMappingCreateModalComponent implements OnInit {
    @Input() providers: ExternalApiProvider[] = [];
    @Input() preselectedProviderId: number | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private readonly externalApiService = inject(ExternalApiService);
    private readonly categoryService = inject(CategoryService);
    private readonly notificationService = inject(NotificationService);
    private readonly fb = inject(FormBuilder);

    form!: FormGroup;
    categories: Category[] = [];
    externalProducts: ExternalProduct[] = [];
    loadingProducts = false;
    loading = false;
    selectedProduct: ExternalProduct | null = null;

    ngOnInit(): void {
        this.initForm();
        this.loadCategories();

        if (this.preselectedProviderId) {
            this.form.patchValue({ providerId: this.preselectedProviderId });
            this.onProviderChange();
        }
    }

    private initForm(): void {
        this.form = this.fb.group({
            providerId: new FormControl('', [Validators.required]),
            externalProductId: new FormControl(''),
            externalProductSlug: new FormControl(''),
            externalProductName: new FormControl(''),
            externalPrice: new FormControl(0),
            categoryId: new FormControl('', [Validators.required]),
            localProductName: new FormControl('', [Validators.required]),
            localPrice: new FormControl(0, [Validators.required, Validators.min(1)]),
            localDescription: new FormControl(''),
            autoSync: new FormControl(true)
        });
    }

    private loadCategories(): void {
        this.categoryService.list({ page: 0, limit: 100 }).subscribe({
            next: (response: any) => {
                if (response.success && response.data?.content) {
                    this.categories = response.data.content;
                }
            }
        });
    }

    onProviderChange(): void {
        const providerId = this.form.get('providerId')?.value;
        if (!providerId) return;

        this.loadingProducts = true;
        this.externalApiService.fetchExternalProducts(Number(providerId)).subscribe({
            next: (response: any) => {
                this.externalProducts = (response.data || []).filter((p: ExternalProduct) => !p.isMapped);
                this.loadingProducts = false;
            },
            error: () => {
                this.notificationService.error('Lỗi khi lấy danh sách sản phẩm từ provider');
                this.loadingProducts = false;
            }
        });
    }

    onProductSelect(product: ExternalProduct): void {
        this.selectedProduct = product;
        this.form.patchValue({
            externalProductId: product.id,
            externalProductSlug: product.slug || '',
            externalProductName: product.name,
            externalPrice: product.price,
            localProductName: product.name,
            localPrice: Math.round(product.price * 1.2)  // Default 20% markup
        });
    }

    get profitAmount(): number {
        const localPrice = this.form.get('localPrice')?.value || 0;
        const externalPrice = this.form.get('externalPrice')?.value || 0;
        return localPrice - externalPrice;
    }

    get profitPercent(): number {
        const externalPrice = this.form.get('externalPrice')?.value || 0;
        if (externalPrice <= 0) return 0;
        return (this.profitAmount / externalPrice) * 100;
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.notificationService.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        this.loading = true;
        const data: ExternalProductMapping = {
            providerId: Number(this.form.get('providerId')?.value),
            externalProductId: this.form.get('externalProductId')?.value,
            externalProductSlug: this.form.get('externalProductSlug')?.value,
            externalProductName: this.form.get('externalProductName')?.value,
            externalPrice: this.form.get('externalPrice')?.value,
            categoryId: Number(this.form.get('categoryId')?.value),
            localProductName: this.form.get('localProductName')?.value,
            localPrice: this.form.get('localPrice')?.value,
            localDescription: this.form.get('localDescription')?.value,
            autoSync: this.form.get('autoSync')?.value
        };

        this.externalApiService.createMapping(data).subscribe({
            next: (response: any) => {
                if (response.success) {
                    this.notificationService.success('Tạo mapping thành công');
                    this.success.emit();
                }
                this.loading = false;
            },
            error: (error: any) => {
                this.notificationService.error(error?.error?.message || 'Có lỗi xảy ra');
                this.loading = false;
            }
        });
    }

    onClose(): void {
        this.close.emit();
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    }
}
