import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExternalApiService, ExternalApiProvider, ExternalProduct } from '../../../../../core/services/external-api.service';
import { NotificationService } from '../../../../../core/services/notification.service';

@Component({
    selector: 'app-external-api-provider-detail-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './detail-modal.component.html',
    styleUrl: './detail-modal.component.scss'
})
export class ExternalApiProviderDetailModalComponent implements OnInit {
    @Input() provider: ExternalApiProvider | null = null;
    @Input() isCreateMode = false;
    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private readonly externalApiService = inject(ExternalApiService);
    private readonly notificationService = inject(NotificationService);
    private readonly fb = inject(FormBuilder);

    form!: FormGroup;
    activeTab: 'basic' | 'product' | 'order' | 'balance' = 'basic';
    loading = false;
    testResult: { success: boolean; balance: any; message: string } | null = null;
    externalProducts: ExternalProduct[] = [];
    loadingProducts = false;
    fetchError: string | null = null;

    ngOnInit(): void {
        this.initForm();
    }

    private initForm(): void {
        this.form = this.fb.group({
            // Basic
            name: new FormControl(this.provider?.name || '', [Validators.required]),
            baseUrl: new FormControl(this.provider?.baseUrl || '', [Validators.required]),
            apiKey: new FormControl(this.provider?.apiKey || ''),
            authType: new FormControl(this.provider?.authType || 'HEADER'),
            authHeaderName: new FormControl(this.provider?.authHeaderName || 'Authorization'),
            authQueryParam: new FormControl(this.provider?.authQueryParam || 'api_key'),

            // Product List API
            productListMethod: new FormControl(this.provider?.productListMethod || 'GET'),
            productListPath: new FormControl(this.provider?.productListPath || ''),
            productListDataPath: new FormControl(this.provider?.productListDataPath || '$.data'),
            productIdPath: new FormControl(this.provider?.productIdPath || '$.id'),
            productNamePath: new FormControl(this.provider?.productNamePath || '$.name'),
            productPricePath: new FormControl(this.provider?.productPricePath || '$.price'),
            productStockPath: new FormControl(this.provider?.productStockPath || '$.stock'),
            productSlugPath: new FormControl(this.provider?.productSlugPath || ''),
            productDescriptionPath: new FormControl(this.provider?.productDescriptionPath || ''),

            // Order API
            orderMethod: new FormControl(this.provider?.orderMethod || 'POST'),
            orderPath: new FormControl(this.provider?.orderPath || ''),
            orderBodyTemplate: new FormControl(this.provider?.orderBodyTemplate || ''),
            orderDataPath: new FormControl(this.provider?.orderDataPath || '$.data'),
            orderSuccessPath: new FormControl(this.provider?.orderSuccessPath || '$.code'),
            orderSuccessValue: new FormControl(this.provider?.orderSuccessValue || '200'),

            // Balance API
            balancePath: new FormControl(this.provider?.balancePath || ''),
            balanceValuePath: new FormControl(this.provider?.balanceValuePath || '$.data'),

            // Sync
            syncIntervalSeconds: new FormControl(this.provider?.syncIntervalSeconds || 300),
            autoSyncEnabled: new FormControl(this.provider?.autoSyncEnabled || false),
            status: new FormControl(this.provider?.status ?? 1),
            notes: new FormControl(this.provider?.notes || '')
        });
    }

    onTabChange(tab: 'basic' | 'product' | 'order' | 'balance'): void {
        this.activeTab = tab;
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.notificationService.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        this.loading = true;
        const data = this.form.getRawValue();

        const observable = this.isCreateMode
            ? this.externalApiService.createProvider(data)
            : this.externalApiService.updateProvider(this.provider!.id!, data);

        observable.subscribe({
            next: (response: any) => {
                if (response.success) {
                    this.notificationService.success(
                        this.isCreateMode ? 'Tạo provider thành công' : 'Cập nhật provider thành công'
                    );
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

    onTestConnection(): void {
        if (this.isCreateMode) {
            this.notificationService.error('Vui lòng lưu provider trước khi test');
            return;
        }

        this.externalApiService.testConnection(this.provider!.id!).subscribe({
            next: (response: any) => {
                this.testResult = response.data;
                if (response.data?.success) {
                    this.notificationService.success('Kết nối thành công!');
                } else {
                    this.notificationService.error(response.data?.message || 'Kết nối thất bại');
                }
            },
            error: (error: any) => {
                this.testResult = { success: false, balance: null, message: 'Lỗi kết nối' };
                this.notificationService.error('Lỗi kết nối');
            }
        });
    }



    // ...

    onFetchProducts(): void {
        if (this.isCreateMode) {
            this.notificationService.error('Vui lòng lưu provider trước');
            return;
        }

        this.loadingProducts = true;
        this.fetchError = null;
        this.externalProducts = [];

        this.externalApiService.fetchExternalProducts(this.provider!.id!).subscribe({
            next: (response: any) => {
                this.externalProducts = response.data || [];
                this.notificationService.success(`Tìm thấy ${this.externalProducts.length} sản phẩm`);
                this.loadingProducts = false;
            },
            error: (error: any) => {
                this.fetchError = error?.error?.message || error?.message || 'Lỗi không xác định';
                this.notificationService.error('Lỗi khi lấy danh sách sản phẩm');
                this.loadingProducts = false;
            }
        });
    }

    onClose(): void {
        this.close.emit();
    }

    use777MailTemplate(): void {
        this.form.patchValue({
            authType: 'HEADER',
            authHeaderName: 'Authorization',
            productListMethod: 'GET',
            productListPath: '/api/v1/products',
            productListDataPath: '$.data',
            productIdPath: '$.id',
            productNamePath: '$.name',
            productPricePath: '$.price',
            productStockPath: '$.counts',
            orderMethod: 'POST',
            orderPath: '/api/v1/order',
            orderBodyTemplate: '{"pid": ${productId}, "pay_id": 0, "num": ${quantity}}',
            orderDataPath: '$.data',
            orderSuccessPath: '$.code',
            orderSuccessValue: '200',
            balancePath: '/api/v1/balance',
            balanceValuePath: '$.data'
        });
        this.notificationService.success('Đã áp dụng template 777mail.vip');
    }

    useMail30sTemplate(): void {
        this.form.patchValue({
            authType: 'QUERY_PARAM',
            authQueryParam: 'api_key',
            productListMethod: 'GET',
            productListPath: '/api/automation/products',
            productListDataPath: '$.data',
            productIdPath: '$.id',
            productNamePath: '$.name',
            productPricePath: '$.price',
            productStockPath: '$.stock',
            productSlugPath: '$.slug',
            orderMethod: 'GET',
            orderPath: '/api/automation/order/create',
            orderBodyTemplate: 'product_slug=${slug}&quantity=${quantity}',
            orderDataPath: '$.data.emails[*].full_info',
            orderSuccessPath: '$.success',
            orderSuccessValue: 'true',
            balancePath: '/api/automation/user/balance',
            balanceValuePath: '$.data.balance'
        });
        this.notificationService.success('Đã áp dụng template mail30s.com');
    }
}
