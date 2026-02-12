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
    @Input() mapping: ExternalProductMapping | null = null;
    @Input() isEditMode = false;
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
    latestExternalProduct: ExternalProduct | null = null;
    loadingLatestProduct = false;
    latestExternalError: string | null = null;
    originalExternalPrice: number | null = null;

    ngOnInit(): void {
        this.initForm();
        this.loadCategories();

        if (this.isEditMode && this.mapping) {
            this.originalExternalPrice = this.mapping.externalPrice ?? null;
            this.form.patchValue({
                providerId: this.mapping.providerId,
                externalProductId: this.mapping.externalProductId || '',
                externalProductSlug: this.mapping.externalProductSlug || '',
                externalProductName: this.mapping.externalProductName || '',
                externalPrice: this.mapping.externalPrice || 0,
                categoryId: this.mapping.categoryId || '',
                localProductName: this.mapping.localProductName || '',
                localPrice: this.mapping.localPrice || 0,
                localDescription: this.mapping.localDescription || '',
                autoSync: this.mapping.autoSync ?? true,
                status: this.mapping.status ?? 1
            });

            this.form.get('providerId')?.disable();
            this.fetchLatestExternalProduct();
        } else if (this.preselectedProviderId) {
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
            autoSync: new FormControl(true),
            status: new FormControl(1)
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
        if (this.isEditMode) return;
        const providerId = this.form.get('providerId')?.value;
        if (!providerId) return;

        this.loadingProducts = true;
        this.externalApiService.fetchExternalProducts(Number(providerId)).subscribe({
            next: (response: any) => {
                const products: ExternalProduct[] = response.data || [];
                // Sort: unmapped first, then mapped
                this.externalProducts = products.sort((a, b) => {
                    if (a.isMapped === b.isMapped) return 0;
                    return a.isMapped ? 1 : -1;
                });
                this.loadingProducts = false;
            },
            error: () => {
                this.notificationService.error('Lỗi khi lấy danh sách sản phẩm từ provider');
                this.loadingProducts = false;
            }
        });
    }

    private fetchLatestExternalProduct(): void {
        if (!this.mapping?.providerId) return;

        this.loadingLatestProduct = true;
        this.latestExternalError = null;

        this.externalApiService.fetchExternalProducts(this.mapping.providerId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.latestExternalError = 'Không lấy được dữ liệu từ nguồn';
                    this.loadingLatestProduct = false;
                    return;
                }
                const products: ExternalProduct[] = response.data || [];
                const externalId = this.mapping?.externalProductId;
                const externalSlug = this.mapping?.externalProductSlug;

                const matched = products.find(product => {
                    if (externalId) return product.id === externalId;
                    if (externalSlug) return product.slug === externalSlug || product.id === externalSlug;
                    return false;
                });

                if (!matched) {
                    this.latestExternalError = 'Không tìm thấy sản phẩm trên nguồn';
                    this.loadingLatestProduct = false;
                    return;
                }

                this.latestExternalProduct = matched;
                this.form.patchValue({
                    externalProductName: matched.name,
                    externalPrice: matched.price
                });
                this.loadingLatestProduct = false;
            },
            error: () => {
                this.latestExternalError = 'Không lấy được dữ liệu từ nguồn';
                this.loadingLatestProduct = false;
            }
        });
    }

    onProductSelect(product: ExternalProduct): void {
        if (this.isEditMode) return;
        this.selectedProduct = product;

        if (product.isMapped) {
            // Pre-fill from existing mapping data
            this.form.patchValue({
                externalProductId: product.id,
                externalProductSlug: product.slug || '',
                externalProductName: product.name,
                externalPrice: product.price,
                categoryId: product.categoryId || '',
                localProductName: product.localProductName || product.name,
                localPrice: product.localPrice || Math.round(product.price * 1.2),
                localDescription: product.localDescription || product.description || '',
                autoSync: product.autoSync ?? true
            });
        } else {
            this.form.patchValue({
                externalProductId: product.id,
                externalProductSlug: product.slug || '',
                externalProductName: product.name,
                externalPrice: product.price,
                localProductName: product.name,
                localPrice: Math.round(product.price * 1.2),  // Default 20% markup
                localDescription: product.description || ''   // Auto-fill mô tả từ nguồn
            });
        }
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
        const raw = this.form.getRawValue();

        if (this.isEditMode && this.mapping?.id) {
            const data: Partial<ExternalProductMapping> = {
                externalProductId: raw.externalProductId,
                externalProductSlug: raw.externalProductSlug,
                externalProductName: raw.externalProductName,
                externalPrice: raw.externalPrice,
                localPrice: raw.localPrice,
                autoSync: raw.autoSync,
                status: raw.status
            };
            const categoryControl = this.form.get('categoryId');
            if (categoryControl?.dirty) {
                data.categoryId = Number(raw.categoryId);
            }
            const nameControl = this.form.get('localProductName');
            if (nameControl?.dirty) {
                data.localProductName = raw.localProductName;
            }
            const descriptionControl = this.form.get('localDescription');
            if (descriptionControl?.dirty) {
                data.localDescription = raw.localDescription;
            }

            this.externalApiService.updateMapping(this.mapping.id, data).subscribe({
                next: (response: any) => {
                    if (response.success) {
                        this.notificationService.success('Cập nhật mapping thành công');
                        this.success.emit();
                    }
                    this.loading = false;
                },
                error: (error: any) => {
                    this.notificationService.error(error?.error?.message || 'Có lỗi xảy ra');
                    this.loading = false;
                }
            });
            return;
        }

        // If selected product is already mapped → update existing mapping
        if (this.selectedProduct?.isMapped && this.selectedProduct?.mappingId) {
            const data: Partial<ExternalProductMapping> = {
                externalProductId: raw.externalProductId,
                externalProductSlug: raw.externalProductSlug,
                externalProductName: raw.externalProductName,
                externalPrice: raw.externalPrice,
                categoryId: Number(raw.categoryId),
                localProductName: raw.localProductName,
                localPrice: raw.localPrice,
                localDescription: raw.localDescription,
                autoSync: raw.autoSync
            };

            this.externalApiService.updateMapping(this.selectedProduct.mappingId, data).subscribe({
                next: (response: any) => {
                    if (response.success) {
                        this.notificationService.success('Cập nhật mapping thành công');
                        this.success.emit();
                    }
                    this.loading = false;
                },
                error: (error: any) => {
                    this.notificationService.error(error?.error?.message || 'Có lỗi xảy ra');
                    this.loading = false;
                }
            });
            return;
        }

        const data: ExternalProductMapping = {
            providerId: Number(raw.providerId),
            externalProductId: raw.externalProductId,
            externalProductSlug: raw.externalProductSlug,
            externalProductName: raw.externalProductName,
            externalPrice: raw.externalPrice,
            categoryId: Number(raw.categoryId),
            localProductName: raw.localProductName,
            localPrice: raw.localPrice,
            localDescription: raw.localDescription,
            autoSync: raw.autoSync
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

    formatCurrency(amount: number | null | undefined): string {
        if (amount === null || amount === undefined) return '—';
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    }
}

