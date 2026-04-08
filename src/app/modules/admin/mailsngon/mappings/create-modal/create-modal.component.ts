import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../../../../core/services/category.service';
import { MailsNgonProductMapping, MailsNgonRemoteProduct, MailsNgonService } from '../../../../../core/services/mailsngon.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { Category } from '../../../../../core/models/category.model';

@Component({
    selector: 'app-mailsngon-mapping-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './create-modal.component.html',
    styleUrl: './create-modal.component.scss'
})
export class MailsNgonMappingCreateModalComponent implements OnInit {
    @Input() mapping: MailsNgonProductMapping | null = null;
    @Input() isEditMode = false;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private readonly mailsNgonService = inject(MailsNgonService);
    private readonly categoryService = inject(CategoryService);
    private readonly notificationService = inject(NotificationService);
    private readonly fb = inject(FormBuilder);

    form!: FormGroup;
    categories: Category[] = [];
    remoteProducts: MailsNgonRemoteProduct[] = [];
    loadingProducts = false;
    loading = false;
    selectedProduct: MailsNgonRemoteProduct | null = null;
    latestRemoteProduct: MailsNgonRemoteProduct | null = null;
    latestRemoteError: string | null = null;
    originalExternalPrice: number | null = null;

    ngOnInit(): void {
        this.initForm();
        this.loadCategories();
        this.loadRemoteProducts();

        if (this.isEditMode && this.mapping) {
            this.originalExternalPrice = this.mapping.externalPrice ?? null;
            this.form.patchValue({
                mailTypeId: this.mapping.mailTypeId || '',
                mailTypeKey: this.mapping.mailTypeKey || '',
                mailTypeName: this.mapping.mailTypeName || '',
                mailGroupName: this.mapping.mailGroupName || '',
                ttl: this.mapping.ttl || '',
                location: this.mapping.location || '',
                note: this.mapping.note || '',
                externalPrice: this.mapping.externalPrice || 0,
                lastSyncedStock: this.mapping.lastSyncedStock ?? null,
                categoryId: this.mapping.categoryId || '',
                localProductName: this.mapping.localProductName || '',
                localPrice: this.mapping.localPrice || 0,
                localDescription: this.mapping.localDescription || '',
                autoSync: this.mapping.autoSync ?? true,
                status: this.mapping.status ?? 1
            });
        }
    }

    private initForm(): void {
        this.form = this.fb.group({
            mailTypeId: new FormControl(''),
            mailTypeKey: new FormControl(''),
            mailTypeName: new FormControl(''),
            mailGroupName: new FormControl(''),
            ttl: new FormControl(''),
            location: new FormControl(''),
            note: new FormControl(''),
            externalPrice: new FormControl(0),
            lastSyncedStock: new FormControl(null),
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

    private loadRemoteProducts(): void {
        this.loadingProducts = true;
        this.latestRemoteError = null;
        this.mailsNgonService.getProducts().subscribe({
            next: (response) => {
                const products = response.data || [];
                this.remoteProducts = [...products].sort((a, b) => {
                    if (!!a.isMapped === !!b.isMapped) return 0;
                    return a.isMapped ? 1 : -1;
                });
                if (this.isEditMode && this.mapping) {
                    this.latestRemoteProduct = products.find(product => product.mailTypeId === this.mapping?.mailTypeId) || null;
                    if (!this.latestRemoteProduct) {
                        this.latestRemoteError = 'Không tìm thấy mail type hiện tại trên MailsNgon';
                    }
                }
                this.loadingProducts = false;
            },
            error: () => {
                this.notificationService.error('Lỗi khi tải sản phẩm MailsNgon');
                this.loadingProducts = false;
            }
        });
    }

    onProductSelect(product: MailsNgonRemoteProduct): void {
        if (this.isEditMode) return;
        this.selectedProduct = product;
        this.form.patchValue({
            mailTypeId: product.mailTypeId,
            mailTypeKey: product.mailTypeKey,
            mailTypeName: product.mailTypeName,
            mailGroupName: product.mailGroupName || '',
            ttl: product.ttl || '',
            location: product.location || '',
            note: product.note || '',
            externalPrice: product.price || 0,
            lastSyncedStock: product.stock ?? null,
            categoryId: product.categoryId || '',
            localProductName: product.localProductName || product.mailTypeName,
            localPrice: product.localPrice || Math.round((product.price || 0) * 1.2),
            localDescription: product.localDescription || product.note || '',
            autoSync: product.autoSync ?? true
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
        const raw = this.form.getRawValue();
        const payload: MailsNgonProductMapping = {
            mailTypeId: raw.mailTypeId,
            mailTypeKey: raw.mailTypeKey,
            mailTypeName: raw.mailTypeName,
            mailGroupName: raw.mailGroupName,
            ttl: raw.ttl,
            location: raw.location,
            note: raw.note,
            externalPrice: raw.externalPrice,
            lastSyncedStock: raw.lastSyncedStock,
            categoryId: Number(raw.categoryId),
            localProductName: raw.localProductName,
            localPrice: raw.localPrice,
            localDescription: raw.localDescription,
            autoSync: raw.autoSync,
            status: raw.status
        };

        if (this.isEditMode && this.mapping?.id) {
            this.mailsNgonService.updateMapping(this.mapping.id, payload).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.notificationService.success('Cập nhật mapping MailsNgon thành công');
                        this.success.emit();
                    }
                    this.loading = false;
                },
                error: (error) => {
                    this.notificationService.error(error?.error?.message || 'Có lỗi khi cập nhật mapping');
                    this.loading = false;
                }
            });
            return;
        }

        if (this.selectedProduct?.isMapped && this.selectedProduct?.mappingId) {
            this.mailsNgonService.updateMapping(this.selectedProduct.mappingId, payload).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.notificationService.success('Cập nhật mapping MailsNgon thành công');
                        this.success.emit();
                    }
                    this.loading = false;
                },
                error: (error) => {
                    this.notificationService.error(error?.error?.message || 'Có lỗi khi cập nhật mapping');
                    this.loading = false;
                }
            });
            return;
        }

        this.mailsNgonService.createMapping(payload).subscribe({
            next: (response) => {
                if (response.success) {
                    this.notificationService.success('Tạo mapping MailsNgon thành công');
                    this.success.emit();
                }
                this.loading = false;
            },
            error: (error) => {
                this.notificationService.error(error?.error?.message || 'Có lỗi khi tạo mapping');
                this.loading = false;
            }
        });
    }

    onClose(): void {
        this.close.emit();
    }

    formatCurrency(amount: number | null | undefined): string {
        if (amount == null) return '—';
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    }
}
