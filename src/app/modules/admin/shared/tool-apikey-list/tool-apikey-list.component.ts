import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product } from '../../../../core/models/product.model';
import { ToolApiKey, ToolApiKeyCreate, ToolApiKeyGenerated } from '../../../../core/models/tool-apikey.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductService } from '../../../../core/services/product.service';
import { ToolApiKeyService } from '../../../../core/services/tool-apikey.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';

type ToolKeyScreenMode = 'reg' | 'oauth2' | 'product-upload';

interface ToolKeyScreenConfig {
    title: string;
    description: string;
    endpointHint: string;
    createUsagePath: string;
    emptyMessage: string;
    modeLabel: string;
    showMailManagementBackLink: boolean;
}

@Component({
    selector: 'app-shared-tool-apikey-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
    templateUrl: './tool-apikey-list.component.html',
    styleUrl: './tool-apikey-list.component.scss'
})
export class ToolApiKeyListComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly toolApiKeyService = inject(ToolApiKeyService);
    private readonly productService = inject(ProductService);
    private readonly notificationService = inject(NotificationService);
    private readonly confirmService = inject(ConfirmService);
    private readonly fb = inject(FormBuilder);

    toolApiKeys: ToolApiKey[] = [];
    availableProducts: Product[] = [];
    showCreateModal = false;
    showKeyModal = false;
    isEditMode = false;
    editingKeyId: number | null = null;
    generatedKey: ToolApiKeyGenerated | null = null;
    formCreate!: FormGroup;
    isLoading = false;
    isLoadingProducts = false;
    mode: ToolKeyScreenMode = 'reg';
    config!: ToolKeyScreenConfig;

    ngOnInit(): void {
        this.mode = (this.route.snapshot.data['toolKeyMode'] as ToolKeyScreenMode) || 'reg';
        this.config = this.resolveConfig(this.mode);
        this.initForm();

        if (this.mode === 'product-upload') {
            this.loadProducts();
        }

        this.loadToolApiKeys();
    }

    private initForm(): void {
        this.formCreate = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(100)]],
            description: ['', Validators.maxLength(500)],
            canProductUpload: [this.mode === 'product-upload'],
            canProductExpiredExport: [this.mode === 'product-upload'],
            allowedProductIds: [[] as number[]]
        });
    }

    private resolveConfig(mode: ToolKeyScreenMode): ToolKeyScreenConfig {
        if (mode === 'oauth2') {
            return {
                title: 'Quản lý OAuth2 Tool API Keys',
                description: 'Cấp Tool API Key cho desktop worker xử lý /oauth2-tool/*.',
                endpointHint: '/api/v1/oauth2-tool/*',
                createUsagePath: '/api/v1/oauth2-tool/pending',
                emptyMessage: 'Chưa có Tool API Key nào cho OAuth2.',
                modeLabel: 'OAuth2',
                showMailManagementBackLink: false
            };
        }

        if (mode === 'product-upload') {
            return {
                title: 'Upload API Keys theo sản phẩm',
                description: 'Cấp Tool API Key cho đối tác upload mail và tải mail hết hạn theo whitelist sản phẩm.',
                endpointHint: '/api/v1/product-items-tool/products/{productId}/*',
                createUsagePath: '/api/v1/product-items-tool/products/123/items',
                emptyMessage: 'Chưa có Upload API Key nào theo sản phẩm.',
                modeLabel: 'Product upload',
                showMailManagementBackLink: true
            };
        }

        return {
            title: 'Quản lý Registration Tool API Keys',
            description: 'Cấp Tool API Key cho desktop worker xử lý /reg-tool/*.',
            endpointHint: '/api/v1/reg-tool/*',
            createUsagePath: '/api/v1/reg-tool/pending',
            emptyMessage: 'Chưa có Tool API Key nào cho Reg.',
            modeLabel: 'Reg',
            showMailManagementBackLink: false
        };
    }

    loadToolApiKeys(): void {
        this.isLoading = true;
        this.toolApiKeyService.getAll().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.toolApiKeys = this.filterKeysByMode(response.data);
                }
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading tool API keys:', error);
                this.notificationService.error('Lỗi khi tải danh sách Tool API Key');
                this.isLoading = false;
            }
        });
    }

    loadProducts(): void {
        this.isLoadingProducts = true;
        this.productService.list({ page: 0, limit: 200 }).subscribe({
            next: (response) => {
                if (response.success && response.data?.content) {
                    this.availableProducts = response.data.content;
                }
                this.isLoadingProducts = false;
            },
            error: (error) => {
                console.error('Error loading products:', error);
                this.notificationService.error('Lỗi khi tải danh sách sản phẩm');
                this.isLoadingProducts = false;
            }
        });
    }

    openModal(key?: ToolApiKey): void {
        if (key) {
            this.isEditMode = true;
            this.editingKeyId = key.id;
            this.formCreate = this.fb.group({
                name: [key.name, [Validators.required, Validators.maxLength(100)]],
                description: [key.description || '', Validators.maxLength(500)],
                canProductUpload: [key.canProductUpload || false],
                canProductExpiredExport: [key.canProductExpiredExport || false],
                allowedProductIds: [key.allowedProductIds || []]
            });
        } else {
            this.isEditMode = false;
            this.editingKeyId = null;
            this.initForm();
        }
        this.showCreateModal = true;
    }

    onCloseCreateModal(): void {
        this.showCreateModal = false;
        this.isEditMode = false;
        this.editingKeyId = null;
    }

    onCloseKeyModal(): void {
        this.showKeyModal = false;
        this.generatedKey = null;
    }

    toggleProductSelection(productId: number, event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        const allowedProductIdsControl = this.formCreate.get('allowedProductIds');
        if (!allowedProductIdsControl) return;

        let currentIds: number[] = allowedProductIdsControl.value || [];

        if (checkbox.checked) {
            if (!currentIds.includes(productId)) {
                currentIds = [...currentIds, productId];
            }
        } else {
            currentIds = currentIds.filter(id => id !== productId);
        }

        allowedProductIdsControl.setValue(currentIds);
        allowedProductIdsControl.markAsDirty();
    }

    isProductSelected(productId: number): boolean {
        const allowedProductIdsControl = this.formCreate.get('allowedProductIds');
        return allowedProductIdsControl?.value?.includes(productId) || false;
    }

    onSubmit(): void {
        if (this.formCreate.invalid) {
            this.notificationService.warning('Vui lòng nhập đầy đủ thông tin bắt buộc');
            this.formCreate.markAllAsTouched();
            return;
        }

        const request = this.buildCreateRequest();
        if (!request) {
            return;
        }

        if (this.isEditMode && this.editingKeyId) {
            this.toolApiKeyService.update(this.editingKeyId, request).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.showCreateModal = false;
                        this.loadToolApiKeys();
                        this.notificationService.success('Cập nhật Tool API Key thành công');
                    }
                },
                error: (error) => {
                    console.error('Error updating tool API key:', error);
                    this.notificationService.error(error?.error?.message || 'Lỗi khi cập nhật Tool API Key');
                }
            });
        } else {
            this.toolApiKeyService.create(request).subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.generatedKey = response.data;
                        this.showCreateModal = false;
                        this.showKeyModal = true;
                        this.loadToolApiKeys();
                        this.notificationService.success('Tạo Tool API Key thành công');
                    }
                },
                error: (error) => {
                    console.error('Error creating tool API key:', error);
                    this.notificationService.error(error?.error?.message || 'Lỗi khi tạo Tool API Key');
                }
            });
        }
    }

    async onRevoke(key: ToolApiKey): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận vô hiệu hóa',
            message: `Vô hiệu hóa Tool API Key "${key.name}"?`,
            confirmText: 'Vô hiệu hóa',
            cancelText: 'Hủy'
        });

        if (!confirmed) {
            return;
        }

        this.toolApiKeyService.revoke(key.id).subscribe({
            next: () => {
                this.notificationService.success('Đã vô hiệu hóa Tool API Key');
                this.loadToolApiKeys();
            },
            error: () => this.notificationService.error('Lỗi khi vô hiệu hóa Tool API Key')
        });
    }

    async onActivate(key: ToolApiKey): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận kích hoạt',
            message: `Kích hoạt lại Tool API Key "${key.name}"?`,
            confirmText: 'Kích hoạt',
            cancelText: 'Hủy'
        });

        if (!confirmed) {
            return;
        }

        this.toolApiKeyService.activate(key.id).subscribe({
            next: () => {
                this.notificationService.success('Đã kích hoạt lại Tool API Key');
                this.loadToolApiKeys();
            },
            error: () => this.notificationService.error('Lỗi khi kích hoạt Tool API Key')
        });
    }

    async onDelete(key: ToolApiKey): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận xóa',
            message: `Xóa vĩnh viễn Tool API Key "${key.name}"? Hành động này không thể hoàn tác.`,
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        });

        if (!confirmed) {
            return;
        }

        this.toolApiKeyService.delete(key.id).subscribe({
            next: () => {
                this.notificationService.success('Đã xóa Tool API Key');
                this.loadToolApiKeys();
            },
            error: () => this.notificationService.error('Lỗi khi xóa Tool API Key')
        });
    }

    copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text).then(() => {
            this.notificationService.success('Đã copy API Key vào clipboard');
        });
    }

    getStatusLabel(status: number): string {
        return status === 0 ? 'Đang hoạt động' : 'Đã vô hiệu hóa';
    }

    getStatusClass(status: number): string {
        return status === 0 ? 'badge-success' : 'badge-danger';
    }

    getCapabilityLabels(key: ToolApiKey): string[] {
        const labels: string[] = [];

        if (key.canRegTool) {
            labels.push('Reg');
        }
        if (key.canOauth2Tool) {
            labels.push('OAuth2');
        }
        if (key.canProductUpload) {
            labels.push('Upload');
        }
        if (key.canProductExpiredExport) {
            labels.push('Xuất hết hạn');
        }
        if (labels.length === 0) {
            labels.push('Legacy reg/oauth2');
        }

        return labels;
    }

    getAllowedProductsLabel(key: ToolApiKey): string {
        if (!key.allowedProducts?.length) {
            return '-';
        }
        return key.allowedProducts.map(product => product.name).join(', ');
    }

    isProductScopeEnabled(): boolean {
        return this.mode === 'product-upload' && (
            this.formCreate.get('canProductUpload')?.value ||
            this.formCreate.get('canProductExpiredExport')?.value
        );
    }

    private buildCreateRequest(): ToolApiKeyCreate | null {
        const baseRequest: ToolApiKeyCreate = {
            name: this.formCreate.get('name')?.value?.trim(),
            description: this.formCreate.get('description')?.value?.trim() || undefined,
            canRegTool: false,
            canOauth2Tool: false,
            canProductUpload: false,
            canProductExpiredExport: false,
            allowedProductIds: []
        };

        if (this.mode === 'reg') {
            return {
                ...baseRequest,
                canRegTool: true
            };
        }

        if (this.mode === 'oauth2') {
            return {
                ...baseRequest,
                canOauth2Tool: true
            };
        }

        const canProductUpload = !!this.formCreate.get('canProductUpload')?.value;
        const canProductExpiredExport = !!this.formCreate.get('canProductExpiredExport')?.value;
        const allowedProductIds = (this.formCreate.get('allowedProductIds')?.value || []) as number[];

        if (!canProductUpload && !canProductExpiredExport) {
            this.notificationService.warning('Hãy chọn ít nhất 1 capability cho upload key');
            return null;
        }

        if (allowedProductIds.length === 0) {
            this.notificationService.warning('Hãy chọn ít nhất 1 sản phẩm cho upload key');
            return null;
        }

        return {
            ...baseRequest,
            canProductUpload,
            canProductExpiredExport,
            allowedProductIds
        };
    }

    private filterKeysByMode(keys: ToolApiKey[]): ToolApiKey[] {
        return keys.filter(key => {
            if (this.mode === 'reg') {
                return !!key.canRegTool || this.isLegacyKey(key);
            }
            if (this.mode === 'oauth2') {
                return !!key.canOauth2Tool || this.isLegacyKey(key);
            }
            return !!key.canProductUpload || !!key.canProductExpiredExport;
        });
    }

    private isLegacyKey(key: ToolApiKey): boolean {
        return !key.canRegTool && !key.canOauth2Tool && !key.canProductUpload && !key.canProductExpiredExport;
    }
}
