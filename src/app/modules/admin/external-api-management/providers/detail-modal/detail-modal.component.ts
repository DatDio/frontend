import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ExternalApiService, ExternalApiProvider, ExternalProduct, FetchProductsResult } from '../../../../../core/services/external-api.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmService } from '../../../../../shared/services/confirm.service';

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
    private readonly confirmService = inject(ConfirmService);

    form!: FormGroup;
    activeTab: 'basic' | 'product' | 'order' | 'balance' = 'basic';

    // Sub-tabs for JSON sections
    activeJsonTab: 'input' | 'fields' | 'raw' | 'preview' = 'input';
    loading = false;
    testResult: { success: boolean; balance: any; message: string } | null = null;
    externalProducts: ExternalProduct[] = [];
    loadingProducts = false;
    fetchError: string | null = null;
    orderError: string | null = null;
    balanceError: string | null = null;

    // JSON Path Picker state - PER TAB to avoid overwriting
    // These are the "current" values used by the UI
    sampleItem: any = null;
    sampleItemRaw: string = '';
    rawResponse: string = '';
    showJsonPicker = false;
    showRawJson = false;
    showPasteJson = false;
    pasteJsonText = '';
    activePathField: string | null = null;

    // Per-tab data storage to restore when switching tabs
    productTabData: { rawResponse: string; sampleItem: any; currentJsonPath: string[] } = { rawResponse: '', sampleItem: null, currentJsonPath: [] };
    orderTabData: { rawResponse: string; sampleItem: any; currentJsonPath: string[] } = { rawResponse: '', sampleItem: null, currentJsonPath: [] };
    balanceTabData: { rawResponse: string; sampleItem: any; currentJsonPath: string[] } = { rawResponse: '', sampleItem: null, currentJsonPath: [] };

    // For recursive JSON tree navigation
    currentJsonPath: string[] = []; // Track the path stack for breadcrumb
    currentJsonNode: any = null; // Current node being displayed
    expandedNodes: Set<string> = new Set(); // Track expanded nodes for inline expansion

    // Preview state for selected JsonPath
    lastPreviewPath: string | null = null;
    lastPreviewValue: any = null;
    lastPreviewError: string | null = null;

    // Custom field mappings - dynamic array
    customFields: { name: string; path: string }[] = [];
    orderErrorMappings: { code: string; message: string; messageEn: string; appErrorCode: string }[] = [];
    orderParams: { key: string; valueType: 'productId' | 'slug' | 'quantity' | 'fixed'; value: string }[] = [];
    orderTemplatePreview = '';
    orderParamValueTypes = [
        { value: 'productId', label: 'productId' },
        { value: 'slug', label: 'slug' },
        { value: 'quantity', label: 'quantity' },
        { value: 'fixed', label: 'Giá trị cố định' }
    ];
    errorCodeOptions = [
        { value: 'NOT_ENOUGH_STOCK', label: 'NOT_ENOUGH_STOCK (11001) - Tồn kho không đủ' },
        { value: 'PRODUCT_NOT_FOUND', label: 'PRODUCT_NOT_FOUND (11000) - Không tìm thấy sản phẩm' },
        { value: 'INTERNAL_SERVER_ERROR', label: 'INTERNAL_SERVER_ERROR (1000) - Lỗi máy chủ nội bộ' }
    ];

    ngOnInit(): void {
        this.initForm();
    }

    private resetPreview(): void {
        this.lastPreviewPath = null;
        this.lastPreviewValue = null;
        this.lastPreviewError = null;
    }

    // Custom validator để kiểm tra path phải bắt đầu bằng $
    private jsonPathValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value;
        if (!value || value.trim() === '') return null; // Cho phép rỗng
        if (!value.trim().startsWith('$')) {
            return { jsonPath: 'Path phải bắt đầu bằng $' };
        }
        return null;
    }

    // Validator kiểm tra URL hợp lệ (http:// hoặc https://)
    private urlValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value;
        if (!value || value.trim() === '') return null;
        const urlPattern = /^https?:\/\/.+/i;
        if (!urlPattern.test(value.trim())) {
            return { url: 'URL phải bắt đầu bằng http:// hoặc https://' };
        }
        return null;
    }

    // Validator kiểm tra API path hợp lệ (bắt đầu bằng /)
    private apiPathValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value;
        if (!value || value.trim() === '') return null; // Cho phép rỗng
        if (!value.trim().startsWith('/')) {
            return { apiPath: 'Path phải bắt đầu bằng /' };
        }
        return null;
    }

    // Validate custom fields và order error mappings trước khi submit
    private validateAllMappings(): string[] {
        const errors: string[] = [];

        // Validate custom fields
        for (const field of this.customFields) {
            if (field.path && field.path.trim() && !field.path.trim().startsWith('$')) {
                errors.push(`Custom field "${field.name}" path phải bắt đầu bằng $`);
            }
            if (field.path && !field.name?.trim()) {
                errors.push('Custom field phải có tên');
            }
        }

        // Validate order error mappings - check duplicate codes
        const errorCodes = this.orderErrorMappings.filter(e => e.code?.trim()).map(e => e.code.trim());
        const duplicateCodes = errorCodes.filter((code, index) => errorCodes.indexOf(code) !== index);
        if (duplicateCodes.length > 0) {
            errors.push(`Mã lỗi trùng: ${[...new Set(duplicateCodes)].join(', ')}`);
        }

        // Validate order error mappings - must have appErrorCode
        for (const err of this.orderErrorMappings) {
            if (err.code?.trim() && !err.appErrorCode?.trim()) {
                errors.push(`Mã lỗi "${err.code}" chưa chọn App Error Code`);
            }
        }

        return errors;
    }

    private initForm(): void {
        this.form = this.fb.group({
            // Basic
            name: new FormControl(this.provider?.name || '', [Validators.required]),
            baseUrl: new FormControl(this.provider?.baseUrl || '', [Validators.required, this.urlValidator.bind(this)]),
            apiKey: new FormControl(this.provider?.apiKey || ''),
            authType: new FormControl(this.provider?.authType || 'HEADER'),
            authHeaderName: new FormControl(this.provider?.authHeaderName || 'Authorization'),
            authQueryParam: new FormControl(this.provider?.authQueryParam || 'api_key'),

            // Product List API
            productListMethod: new FormControl(this.provider?.productListMethod || 'GET'),
            productListPath: new FormControl(this.provider?.productListPath || '', [this.apiPathValidator.bind(this)]),
            productListDataPath: new FormControl(this.provider?.productListDataPath || '', [this.jsonPathValidator.bind(this)]),
            productIdPath: new FormControl(this.provider?.productIdPath || '', [this.jsonPathValidator.bind(this)]),
            productNamePath: new FormControl(this.provider?.productNamePath || '', [this.jsonPathValidator.bind(this)]),
            productPricePath: new FormControl(this.provider?.productPricePath || '', [this.jsonPathValidator.bind(this)]),
            productStockPath: new FormControl(this.provider?.productStockPath || '', [this.jsonPathValidator.bind(this)]),

            // Order API
            orderMethod: new FormControl(this.provider?.orderMethod || 'POST'),
            orderPath: new FormControl(this.provider?.orderPath || '', [this.apiPathValidator.bind(this)]),
            orderBodyTemplate: new FormControl(this.provider?.orderBodyTemplate || ''),
            orderDataPath: new FormControl(this.provider?.orderDataPath || '', [this.jsonPathValidator.bind(this)]),
            orderNumberPath: new FormControl(this.provider?.orderNumberPath || '', [this.jsonPathValidator.bind(this)]),
            orderErrorCodePath: new FormControl(this.provider?.orderErrorCodePath || '', [this.jsonPathValidator.bind(this)]),

            // Common Response Config (dùng chung cho tất cả API)
            successPath: new FormControl(this.provider?.successPath || '', [this.jsonPathValidator.bind(this)]),
            successValue: new FormControl(this.provider?.successValue || ''),
            messagePath: new FormControl(this.provider?.messagePath || '', [this.jsonPathValidator.bind(this)]),

            // Balance API
            balancePath: new FormControl(this.provider?.balancePath || '', [this.apiPathValidator.bind(this)]),
            balanceValuePath: new FormControl(this.provider?.balanceValuePath || '', [this.jsonPathValidator.bind(this)]),

            // Sync
            syncIntervalSeconds: new FormControl(this.provider?.syncIntervalSeconds || 5, [Validators.min(1)]),
            autoSyncEnabled: new FormControl(this.provider?.autoSyncEnabled || false),
            status: new FormControl(this.provider?.status ?? 1),
            notes: new FormControl(this.provider?.notes || '')
        });

        // Parse custom field mappings from JSON
        if (this.provider?.customFieldMappings) {
            try {
                this.customFields = JSON.parse(this.provider.customFieldMappings);
            } catch (e) {
                this.customFields = [];
            }
        }
        if (this.provider?.orderErrorCodeMappings) {
            try {
                const parsed = JSON.parse(this.provider.orderErrorCodeMappings);
                if (Array.isArray(parsed)) {
                    this.orderErrorMappings = parsed.map((item: any) => ({
                        code: item?.code || '',
                        message: item?.message || item?.messageVi || '',
                        messageEn: item?.messageEn || item?.message_en || '',
                        appErrorCode: item?.appErrorCode || item?.errorCode || ''
                    }));
                } else {
                    this.orderErrorMappings = [];
                }
            } catch (e) {
                this.orderErrorMappings = [];
            }
        }

        const initialOrderTemplate = this.provider?.orderBodyTemplate || '';
        const initialOrderMethod = (this.provider?.orderMethod || this.form.get('orderMethod')?.value || 'POST') as string;
        this.orderParams = this.parseOrderTemplate(initialOrderTemplate, initialOrderMethod);
        this.syncOrderTemplatePreview();

        this.form.get('orderMethod')?.valueChanges.subscribe(() => {
            this.syncOrderTemplatePreview();
        });
    }

    onTabChange(tab: 'basic' | 'product' | 'order' | 'balance'): void {
        // Save current tab's data before switching
        this.saveCurrentTabData();

        this.activeTab = tab;
        this.activeJsonTab = 'input'; // Reset sub-tab

        // Restore new tab's data
        this.restoreTabData(tab);
    }

    private saveCurrentTabData(): void {
        const data = {
            rawResponse: this.rawResponse,
            sampleItem: this.sampleItem,
            currentJsonPath: [...this.currentJsonPath]
        };
        switch (this.activeTab) {
            case 'product':
                this.productTabData = data;
                break;
            case 'order':
                this.orderTabData = data;
                break;
            case 'balance':
                this.balanceTabData = data;
                break;
        }
    }

    private restoreTabData(tab: 'basic' | 'product' | 'order' | 'balance'): void {
        let data = { rawResponse: '', sampleItem: null, currentJsonPath: [] as string[] };
        switch (tab) {
            case 'product':
                data = this.productTabData;
                break;
            case 'order':
                data = this.orderTabData;
                break;
            case 'balance':
                data = this.balanceTabData;
                break;
        }
        this.rawResponse = data.rawResponse;
        this.sampleItem = data.sampleItem;
        this.currentJsonPath = [...data.currentJsonPath];
        this.currentJsonNode = data.sampleItem;
        this.expandedNodes.clear();
        this.resetPreview();
    }

    setJsonTab(tab: 'input' | 'fields' | 'raw' | 'preview'): void {
        this.activeJsonTab = tab;
    }

    addCustomField(): void {
        this.customFields.push({ name: '', path: '' });
    }

    removeCustomField(index: number): void {
        this.customFields.splice(index, 1);
    }

    addOrderErrorMapping(): void {
        this.orderErrorMappings.push({ code: '', message: '', messageEn: '', appErrorCode: '' });
    }

    removeOrderErrorMapping(index: number): void {
        this.orderErrorMappings.splice(index, 1);
    }

    addOrderParam(): void {
        this.orderParams.push({ key: '', valueType: 'productId', value: '' });
        this.syncOrderTemplatePreview();
    }

    removeOrderParam(index: number): void {
        this.orderParams.splice(index, 1);
        this.syncOrderTemplatePreview();
    }

    togglePasteJson(): void {
        this.showPasteJson = !this.showPasteJson;
        if (this.showPasteJson) {
            this.showJsonPicker = false;
            this.showRawJson = false;
        }
    }

    parseJsonInput(): void {
        if (!this.pasteJsonText.trim()) {
            this.notificationService.error('Vui lòng paste JSON vào');
            return;
        }
        try {
            const json = JSON.parse(this.pasteJsonText);
            // Store the FULL JSON structure for navigation
            this.sampleItem = json;
            this.currentJsonNode = json;
            this.currentJsonPath = [];
            this.expandedNodes.clear();
            this.resetPreview();
            this.rawResponse = JSON.stringify(json, null, 2);
            this.activeJsonTab = 'fields'; // Auto switch to fields
            this.notificationService.success('Đã parse JSON thành công! Click vào các field để navigate hoặc chọn path');
        } catch (e) {
            this.notificationService.error('JSON không hợp lệ!');
        }
    }

    private captureErrorResponse(error: any): { raw: string; parsed: any | null } {
        const rawFromData = error?.error?.data?.rawResponse;
        if (typeof rawFromData === 'string') {
            try {
                return { raw: JSON.stringify(JSON.parse(rawFromData), null, 2), parsed: JSON.parse(rawFromData) };
            } catch {
                return { raw: rawFromData, parsed: null };
            }
        }
        if (rawFromData !== undefined && rawFromData !== null) {
            return { raw: JSON.stringify(rawFromData, null, 2), parsed: rawFromData };
        }

        const errorBody = error?.error;
        if (typeof errorBody === 'string') {
            return { raw: errorBody, parsed: null };
        }
        if (errorBody !== undefined && errorBody !== null) {
            return { raw: JSON.stringify(errorBody, null, 2), parsed: errorBody };
        }
        if (error?.message) {
            return { raw: String(error.message), parsed: null };
        }
        return { raw: 'Unknown error', parsed: null };
    }

    onSubmit(): void {
        // Mark all controls as touched để hiển thị validation errors
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            // Tìm lỗi validation cụ thể
            const errors: string[] = [];
            Object.keys(this.form.controls).forEach(key => {
                const control = this.form.get(key);
                if (control?.errors?.['jsonPath']) {
                    errors.push(`${key}: ${control.errors['jsonPath']}`);
                } else if (control?.errors?.['url']) {
                    errors.push(`${key}: ${control.errors['url']}`);
                } else if (control?.errors?.['apiPath']) {
                    errors.push(`${key}: ${control.errors['apiPath']}`);
                } else if (control?.errors?.['min']) {
                    errors.push(`${key}: Giá trị phải >= ${control.errors['min'].min}`);
                } else if (control?.errors?.['required']) {
                    errors.push(`${key}: Trường này bắt buộc`);
                }
            });
            if (errors.length > 0) {
                this.notificationService.error(errors.join(', '));
            } else {
                this.notificationService.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            }
            return;
        }

        // Validate custom fields và order error mappings
        const mappingErrors = this.validateAllMappings();
        if (mappingErrors.length > 0) {
            this.notificationService.error(mappingErrors.join(', '));
            return;
        }

        this.loading = true;
        const data = this.form.getRawValue();
        this.syncOrderTemplatePreview();

        // Add custom field mappings as JSON
        const validCustomFields = this.customFields.filter(f => f.name && f.path);
        data.customFieldMappings = validCustomFields.length > 0
            ? JSON.stringify(validCustomFields)
            : null;
        const validOrderErrors = this.orderErrorMappings.filter(e => e.code && e.appErrorCode);
        data.orderErrorCodeMappings = validOrderErrors.length > 0
            ? JSON.stringify(validOrderErrors)
            : null;

        const observable = this.isCreateMode
            ? this.externalApiService.createProvider(data)
            : this.externalApiService.updateProvider(this.provider!.id!, data);

        observable.subscribe({
            next: (response: any) => {
                if (response.success) {
                    this.notificationService.success(
                        this.isCreateMode ? 'Tạo provider thành công' : 'Cập nhật provider thành công'
                    );
                    if (response.data) {
                        this.provider = response.data;
                        this.isCreateMode = false;
                    }
                    this.success.emit();
                    if (this.activeTab === 'product') {
                        this.activeJsonTab = 'preview';
                        this.onFetchProducts(true);
                    }
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
            this.notificationService.error('Vui lòng điền đầy đủ thông tin bắt buộc');
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

    testBalanceApi(): void {
        if (this.form.invalid) {
            this.notificationService.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        this.loading = true;
        this.balanceError = null;
        this.rawResponse = '';
        this.sampleItem = null;
        this.currentJsonNode = null;
        this.currentJsonPath = [];
        this.expandedNodes.clear();
        this.resetPreview();
        const data = this.form.getRawValue();
        const validCustomFields = this.customFields.filter(f => f.name && f.path);
        data.customFieldMappings = validCustomFields.length > 0
            ? JSON.stringify(validCustomFields)
            : null;
        const validOrderErrors = this.orderErrorMappings.filter(e => e.code && e.appErrorCode);
        data.orderErrorCodeMappings = validOrderErrors.length > 0
            ? JSON.stringify(validOrderErrors)
            : null;
        if (this.provider?.id) {
            data.id = this.provider.id;
        }

        this.externalApiService.getBalancePreview(data).subscribe({
            next: (response: any) => {
                this.balanceError = null;
                // Parse the response for JSON picker
                const data = response?.data;
                if (data) {
                    // Use rawResponse from backend
                    if (data.rawResponse) {
                        try {
                            this.rawResponse = JSON.stringify(JSON.parse(data.rawResponse), null, 2);
                        } catch {
                            this.rawResponse = data.rawResponse;
                        }
                    }
                    // Parse sampleItem and initialize tree navigation
                    let parsedSample = null;
                    if (data.sampleItem) {
                        try {
                            parsedSample = JSON.parse(data.sampleItem);
                        } catch {
                            parsedSample = data;
                        }
                    } else if (data.rawResponse) {
                        try {
                            parsedSample = JSON.parse(data.rawResponse);
                        } catch {
                            parsedSample = data;
                        }
                    } else {
                        parsedSample = data;
                    }

                    // Initialize tree navigation
                    this.sampleItem = parsedSample;
                    this.currentJsonNode = parsedSample;
                    this.currentJsonPath = [];
                    this.expandedNodes.clear();
                    this.resetPreview();

                    this.showJsonPicker = true;
                    this.notificationService.success('Đã lấy response Balance API!');
                    // Save to balanceTabData for tab switching
                    this.balanceTabData = {
                        rawResponse: this.rawResponse,
                        sampleItem: this.sampleItem,
                        currentJsonPath: [...this.currentJsonPath]
                    };
                }
                this.loading = false;
            },
            error: (error: any) => {
                this.balanceError = error?.error?.message || error?.message || 'Lỗi không xác định';
                const captured = this.captureErrorResponse(error);
                this.rawResponse = captured.raw;
                this.sampleItem = null;
                this.currentJsonNode = null;
                this.currentJsonPath = [];
                this.expandedNodes.clear();
                this.resetPreview();
                this.notificationService.error('Lỗi khi gọi Balance API');
                this.loading = false;
            }
        });
    }

    async testOrderApi(): Promise<void> {
        if (this.form.invalid) {
            this.notificationService.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        // Prompt for test product ID using ConfirmService
        const productId = await this.confirmService.prompt({
            title: 'Test Order API',
            message: '⚠️ Đây là test thật và có thể tốn tiền!',
            inputLabel: 'Product ID để test đặt hàng:',
            placeholder: 'Nhập Product ID...',
            confirmText: 'Tiếp tục',
            cancelText: 'Hủy',
            confirmButtonClass: 'btn-warning',
            required: true
        });

        if (!productId) {
            return;
        }

        // Confirm warning
        const confirmed = await this.confirmService.confirm({
            title: '⚠️ CẢNH BÁO',
            message: 'Đây là TEST THẬT! Đơn hàng sẽ có thật và có thể TỐN TIỀN! Bạn có chắc muốn tiếp tục?',
            confirmText: 'Đặt thử',
            cancelText: 'Hủy bỏ',
            confirmButtonClass: 'btn-danger'
        });

        if (!confirmed) {
            return;
        }

        this.loading = true;
        this.orderError = null;
        this.rawResponse = '';
        this.sampleItem = null;
        this.currentJsonNode = null;
        this.currentJsonPath = [];
        this.expandedNodes.clear();
        this.resetPreview();
        const data = this.form.getRawValue();
        this.syncOrderTemplatePreview();
        const validCustomFields = this.customFields.filter(f => f.name && f.path);
        data.customFieldMappings = validCustomFields.length > 0
            ? JSON.stringify(validCustomFields)
            : null;
        const validOrderErrors = this.orderErrorMappings.filter(e => e.code && e.appErrorCode);
        data.orderErrorCodeMappings = validOrderErrors.length > 0
            ? JSON.stringify(validOrderErrors)
            : null;
        if (this.provider?.id) {
            data.id = this.provider.id;
        }

        this.externalApiService.placeTestOrderPreview(data, productId, 1).subscribe({
            next: (response: any) => {
                this.orderError = null;
                // Parse the response for JSON picker
                if (response) {
                    this.rawResponse = JSON.stringify(response, null, 2);
                    // Initialize tree with FULL response, not just .data
                    this.sampleItem = response;
                    this.currentJsonNode = response;
                    this.currentJsonPath = [];
                    this.expandedNodes.clear();
                    this.resetPreview();
                    this.showJsonPicker = true;
                    this.notificationService.success('Đã gọi Order API! Xem response bên dưới.');
                    // Save to orderTabData for tab switching
                    this.orderTabData = {
                        rawResponse: this.rawResponse,
                        sampleItem: this.sampleItem,
                        currentJsonPath: [...this.currentJsonPath]
                    };
                }
                this.loading = false;
            },
            error: (error: any) => {
                this.orderError = error?.error?.message || error?.message || 'Lỗi không xác định';
                const captured = this.captureErrorResponse(error);
                this.rawResponse = captured.raw;
                this.sampleItem = null;
                this.currentJsonNode = null;
                this.currentJsonPath = [];
                this.expandedNodes.clear();
                this.resetPreview();
                this.notificationService.error('Lỗi khi gọi Order API: ' + (error?.error?.message || error?.message));
                this.loading = false;
            }
        });
    }

    onFetchProducts(autoPreview: boolean = false): void {
        if (this.form.invalid) {
            this.notificationService.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        this.loadingProducts = true;
        this.fetchError = null;
        this.externalProducts = [];
        this.sampleItem = null;
        this.sampleItemRaw = '';
        this.rawResponse = '';
        this.currentJsonPath = [];
        this.currentJsonNode = null;
        this.expandedNodes.clear();
        this.resetPreview();


        const data = this.form.getRawValue();
        const validCustomFields = this.customFields.filter(f => f.name && f.path);
        data.customFieldMappings = validCustomFields.length > 0
            ? JSON.stringify(validCustomFields)
            : null;
        const validOrderErrors = this.orderErrorMappings.filter(e => e.code && e.appErrorCode);
        data.orderErrorCodeMappings = validOrderErrors.length > 0
            ? JSON.stringify(validOrderErrors)
            : null;
        if (this.provider?.id) {
            data.id = this.provider.id;
        }

        this.externalApiService.fetchExternalProductsWithRawPreview(data).subscribe({
            next: (response: any) => {
                const data: FetchProductsResult = response.data;
                this.externalProducts = data?.products || [];

                // Store raw response for display AND for tree navigation
                let fullResponse: any = null;
                if (data?.rawResponse) {
                    try {
                        fullResponse = JSON.parse(data.rawResponse);
                        this.rawResponse = JSON.stringify(fullResponse, null, 2);
                    } catch (e) {
                        this.rawResponse = data.rawResponse;
                    }
                }

                // Initialize tree with FULL response for navigation
                // sampleItem from backend is just ONE item, we need full response for proper path building
                if (fullResponse) {
                    this.sampleItem = fullResponse;
                    this.currentJsonNode = fullResponse;
                } else if (data?.sampleItem) {
                    try {
                        const parsed = JSON.parse(data.sampleItem);
                        this.sampleItem = parsed;
                        this.currentJsonNode = parsed;
                        this.sampleItemRaw = data.sampleItem;
                    } catch (e) {
                        this.sampleItemRaw = data.sampleItem;
                    }
                }

                this.notificationService.success(`Tìm thấy ${this.externalProducts.length} sản phẩm`);
                if (autoPreview) {
                    this.activeJsonTab = 'preview';
                }
                // Save to productTabData for tab switching
                this.productTabData = {
                    rawResponse: this.rawResponse,
                    sampleItem: this.sampleItem,
                    currentJsonPath: [...this.currentJsonPath]
                };
                this.loadingProducts = false;
            },
            error: (error: any) => {
                this.fetchError = error?.error?.message || error?.message || 'Lỗi không xác định';
                if (autoPreview) {
                    this.activeJsonTab = 'input';
                }
                this.notificationService.error('Loi khi lay danh sach san pham');
                this.loadingProducts = false;
            }
        });
    }

    onOrderParamChange(): void {
        this.syncOrderTemplatePreview();
    }

    // JSON Path Picker methods
    toggleJsonPicker(): void {
        this.showJsonPicker = !this.showJsonPicker;
        if (this.showJsonPicker) {
            this.showRawJson = false; // Close raw JSON when opening picker
        }
    }

    toggleRawJson(): void {
        this.showRawJson = !this.showRawJson;
        if (this.showRawJson) {
            this.showJsonPicker = false; // Close picker when opening raw JSON
        }
    }

    startPathSelection(fieldName: string): void {
        if (!this.sampleItem) {
            this.notificationService.error('Vui lòng "Test Fetch" trước để lấy cấu trúc JSON');
            return;
        }
        this.activePathField = fieldName;
        this.showJsonPicker = true;
    }

    startResponsePathSelection(fieldName: string): void {
        if (this.activeTab === 'basic') {
            this.activeTab = 'product';
        }
        this.activeJsonTab = 'fields';
        this.startPathSelection(fieldName);
    }

    /**
     * Navigate into a nested object/array or select the path
     * @param key The key to navigate into
     * @param selectPath If true, select this path for the active field
     */
    selectJsonPath(key: string, selectPath: boolean = false): void {
        const value = this.currentJsonNode?.[key];
        const isExpandable = this.isExpandable(value);

        if (selectPath && this.activePathField) {
            // Build full JsonPath from current navigation + key
            const fullPath = this.buildJsonPath(key, value);
            this.applyPathToField(fullPath);
            return;
        }

        // If not selecting and value is expandable, navigate into it
        if (isExpandable && !selectPath) {
            this.navigateInto(key, value);
        } else if (this.activePathField) {
            // If value is primitive and we have an active field, select it
            const fullPath = this.buildJsonPath(key, value);
            this.applyPathToField(fullPath);
        }
    }

    /**
     * Build the full JsonPath string from current path + new key
     */
    buildJsonPath(key: string, value: any): string {
        let path = '$';

        // Add current navigation path
        for (const segment of this.currentJsonPath) {
            if (segment.startsWith('[')) {
                path += segment;
            } else if (/^\d+$/.test(segment)) {
                path += '[' + segment + ']';
            } else {
                path += '.' + segment;
            }
        }

        // Add the new key
        if (key.startsWith('[')) {
            path += key;
        } else if (/^\d+$/.test(key)) {
            path += '[' + key + ']';
        } else {
            path += '.' + key;
        }

        // If the value is an array and we want all items, add [*]
        if (Array.isArray(value) && value.length > 0) {
            path += '[*]';
        }

        return path;
    }

    /**
     * Apply the selected path to the active field
     */
    applyPathToField(path: string): void {
        if (!this.activePathField) return;

        const isItemField = this.isItemField(this.activePathField);
        const normalizedPath = isItemField ? this.normalizeItemPath(path) : path;
        const previewPath = isItemField ? this.buildPreviewPathForItem(normalizedPath) : normalizedPath;

        // Check if this is a custom field (format: custom_N)
        if (this.activePathField.startsWith('custom_')) {
            const index = Number.parseInt(this.activePathField.replace('custom_', ''), 10);
            if (!Number.isNaN(index) && this.customFields[index]) {
                this.customFields[index].path = normalizedPath;
            }
        } else {
            this.form.get(this.activePathField)?.setValue(normalizedPath);
        }

        // Update preview for the selected path
        this.updatePreview(previewPath);

        this.notificationService.success(`Đã chọn: ${normalizedPath}`);
        this.activePathField = null;
    }

    private isItemField(fieldName: string): boolean {
        return fieldName === 'productIdPath'
            || fieldName === 'productNamePath'
            || fieldName === 'productPricePath'
            || fieldName === 'productStockPath'
            || fieldName.startsWith('custom_');
    }

    private getDataPath(): string {
        return (this.form.get('productListDataPath')?.value || '').trim();
    }

    private normalizeItemPath(path: string): string {
        const dataPath = this.getDataPath();
        if (!dataPath || !path) return path;

        const base = this.stripArraySelector(dataPath);
        if (!base || base === '$') return path;

        if (!path.startsWith(base)) return path;

        let remainder = path.slice(base.length);
        remainder = remainder.replace(/^\[\d+\]/, '').replace(/^\[\*\]/, '').replace(/^\.\d+/, '');

        if (!remainder) return '$';
        if (remainder.startsWith('.')) return '$' + remainder;
        if (remainder.startsWith('[')) return '$' + remainder;
        return '$.' + remainder;
    }

    private buildPreviewPathForItem(itemPath: string): string {
        const dataPath = this.getDataPath();
        if (!dataPath) return itemPath;

        const baseNoIndex = this.stripArraySelector(dataPath);
        if (baseNoIndex && itemPath.startsWith(baseNoIndex)) {
            return itemPath;
        }

        let base = dataPath.trim();
        if (base === '$') {
            base = '$[0]';
        } else if (/\[\*\]$/.test(base)) {
            base = base.replace(/\[\*\]$/, '[0]');
        } else if (!/\[\d+\]$/.test(base)) {
            base = base + '[0]';
        }

        if (itemPath === '$') return base;

        const suffix = itemPath.startsWith('$.')
            ? itemPath.slice(1)
            : itemPath.startsWith('$')
                ? itemPath.slice(1)
                : '.' + itemPath;

        return base + suffix;
    }

    private syncOrderTemplatePreview(): void {
        const template = this.buildOrderTemplate();
        this.orderTemplatePreview = template;
        this.form.get('orderBodyTemplate')?.setValue(template, { emitEvent: false });
    }

    private buildOrderTemplate(): string {
        const method = (this.form.get('orderMethod')?.value || 'POST') as string;
        const params = this.orderParams.filter(p => p.key && p.key.trim().length > 0);
        if (params.length === 0) {
            return '';
        }

        if (method.toUpperCase() === 'GET') {
            return params
                .map(p => `${p.key.trim()}=${this.buildOrderValue(p)}`)
                .join('&');
        }

        const entries = params.map(p => `"${this.escapeJsonKey(p.key)}": ${this.buildOrderValue(p, true)}`);
        return `{${entries.join(', ')}}`;
    }

    private buildOrderValue(param: { key: string; valueType: 'productId' | 'slug' | 'quantity' | 'fixed'; value: string }, jsonMode: boolean = false): string {
        if (param.valueType === 'productId') return '${productId}';
        if (param.valueType === 'slug') return '${slug}';
        if (param.valueType === 'quantity') return '${quantity}';

        const raw = (param.value || '').trim();
        if (!jsonMode) {
            return raw;
        }

        return this.formatFixedValue(raw);
    }

    private formatFixedValue(value: string): string {
        if (value === '') {
            return '""';
        }
        const trimmed = value.trim();
        if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null') {
            return trimmed;
        }
        const numeric = Number(trimmed);
        if (!Number.isNaN(numeric) && trimmed === String(numeric)) {
            return trimmed;
        }
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            return trimmed;
        }
        return JSON.stringify(trimmed);
    }

    private escapeJsonKey(key: string): string {
        return key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    private parseOrderTemplate(template: string, method: string): { key: string; valueType: 'productId' | 'slug' | 'quantity' | 'fixed'; value: string }[] {
        if (!template || !template.trim()) return [];

        const isGet = (method || '').toUpperCase() === 'GET';
        const trimmed = template.trim();
        if (isGet || (!trimmed.startsWith('{') && trimmed.includes('='))) {
            return this.parseOrderQueryTemplate(trimmed);
        }
        return this.parseOrderJsonTemplate(trimmed);
    }

    private parseOrderQueryTemplate(template: string): { key: string; valueType: 'productId' | 'slug' | 'quantity' | 'fixed'; value: string }[] {
        const params: { key: string; valueType: 'productId' | 'slug' | 'quantity' | 'fixed'; value: string }[] = [];
        for (const pair of template.split('&')) {
            if (!pair) continue;
            const idx = pair.indexOf('=');
            const key = idx >= 0 ? pair.slice(0, idx) : pair;
            const value = idx >= 0 ? pair.slice(idx + 1) : '';
            if (!key.trim()) continue;
            params.push(this.buildOrderParamFromValue(key, value));
        }
        return params;
    }

    private parseOrderJsonTemplate(template: string): { key: string; valueType: 'productId' | 'slug' | 'quantity' | 'fixed'; value: string }[] {
        const params: { key: string; valueType: 'productId' | 'slug' | 'quantity' | 'fixed'; value: string }[] = [];
        const regex = /\"([^\"]+)\"\\s*:\\s*([^,}]+)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(template)) !== null) {
            const key = match[1];
            let value = match[2].trim();
            if (value.endsWith(',')) value = value.slice(0, -1).trim();
            if (!key.trim()) continue;
            params.push(this.buildOrderParamFromValue(key, value));
        }
        return params;
    }

    private buildOrderParamFromValue(key: string, rawValue: string): { key: string; valueType: 'productId' | 'slug' | 'quantity' | 'fixed'; value: string } {
        const trimmed = rawValue.trim();
        if (trimmed === '${productId}') return { key: key.trim(), valueType: 'productId', value: '' };
        if (trimmed === '${slug}') return { key: key.trim(), valueType: 'slug', value: '' };
        if (trimmed === '${quantity}') return { key: key.trim(), valueType: 'quantity', value: '' };

        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            const unquoted = trimmed.slice(1, -1);
            return { key: key.trim(), valueType: 'fixed', value: unquoted };
        }
        return { key: key.trim(), valueType: 'fixed', value: trimmed };
    }

    private stripArraySelector(path: string): string {
        let base = path.trim();
        base = base.replace(/\[\*\]$/, '').replace(/\[\d+\]$/, '');
        return base;
    }

    /**
     * Evaluate a JsonPath string against the sampleItem (simple evaluator)
     * Supports syntax: $.prop1.prop2[*].prop3 and numeric indexes
     */
    private evaluateJsonPath(path: string, json: any): { value: any; error?: string } {
        if (!json) return { value: null, error: 'Chưa có sample JSON để preview' };
        if (!path || !path.startsWith('$')) return { value: null, error: 'Path phải bắt đầu bằng $' };

        if (path === '$') {
            return { value: json };
        }

        // Remove starting "$."
        const cleaned = path.startsWith('$.') ? path.slice(2) : path.slice(1);
        const segments = cleaned.split('.');
        let nodes: any[] = [json];

        for (const segment of segments) {
            if (!segment) continue;

            const match = segment.match(/^([^\[]+)(\[(\*|\d+)\])?$/);
            if (!match) {
                return { value: null, error: `Segment không hợp lệ: ${segment}` };
            }

            const prop = match[1];
            const arrSel = match[3];
            const next: any[] = [];

            for (const node of nodes) {
                if (node == null) continue;
                const val = node[prop];
                if (arrSel === undefined) {
                    next.push(val);
                } else if (arrSel === '*') {
                    if (Array.isArray(val)) {
                        next.push(...val);
                    } else {
                        return { value: null, error: `Trường ${prop} không phải array` };
                    }
                } else {
                    const idx = Number.parseInt(arrSel, 10);
                    if (Array.isArray(val) && val.length > idx) {
                        next.push(val[idx]);
                    } else {
                        return { value: null, error: `Index ${idx} không hợp lệ tại ${prop}` };
                    }
                }
            }

            if (next.length === 0) {
                return { value: null, error: `Không tìm thấy dữ liệu tại ${segment}` };
            }
            nodes = next;
        }

        // Náº¿u nhiá»u node, tráº£ vá» máº£ng; náº¿u má»t node, tráº£ vá» chÃ­nh nÃ³
        if (nodes.length === 1) {
            return { value: nodes[0] };
        }
        return { value: nodes };
    }

    /**
     * Update preview state for a given JsonPath
     */
    private updatePreview(path: string): void {
        this.lastPreviewPath = path;
        const result = this.evaluateJsonPath(path, this.sampleItem);
        if (result.error) {
            this.lastPreviewError = result.error;
            this.lastPreviewValue = null;
        } else {
            this.lastPreviewError = null;
            this.lastPreviewValue = result.value;
        }
    }

    /**
     * Navigate into a nested object or array
     */
    navigateInto(key: string, value: any): void {
        this.currentJsonPath.push(key);

        if (Array.isArray(value)) {
            // For arrays, show the first item as sample but indicate it's an array
            if (value.length > 0) {
                this.currentJsonPath.push('[0]'); // Navigate into first item
                this.currentJsonNode = value[0];
            } else {
                this.currentJsonNode = value;
            }
        } else {
            this.currentJsonNode = value;
        }
    }

    /**
     * Navigate back to a previous level using breadcrumb
     */
    navigateToLevel(index: number): void {
        if (index < 0) {
            // Go to root
            this.currentJsonPath = [];
            this.currentJsonNode = this.sampleItem;
            return;
        }

        // Slice path to the selected level
        this.currentJsonPath = this.currentJsonPath.slice(0, index + 1);

        // Rebuild currentJsonNode by traversing from root
        let node = this.sampleItem;
        for (const segment of this.currentJsonPath) {
            if (segment.startsWith('[')) {
                const idx = Number.parseInt(segment.replaceAll(/[[\]]/g, ''), 10);
                node = node[idx];
            } else {
                node = node[segment];
            }
        }
        this.currentJsonNode = node;
    }

    /**
     * Check if a value can be expanded (is object or array with content)
     */
    isExpandable(value: any): boolean {
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return false;
    }

    /**
     * Get the current breadcrumb path for display
     */
    getBreadcrumb(): { label: string; index: number }[] {
        const breadcrumb: { label: string; index: number }[] = [
            { label: '$', index: -1 }
        ];

        this.currentJsonPath.forEach((segment, idx) => {
            breadcrumb.push({
                label: segment,
                index: idx
            });
        });

        return breadcrumb;
    }

    /**
     * Get display info for current node's keys
     */
    getNodeKeys(): { key: string; value: any; type: string; expandable: boolean; preview: string }[] {
        if (!this.currentJsonNode || typeof this.currentJsonNode !== 'object') {
            return [];
        }

        return Object.keys(this.currentJsonNode).map(key => {
            const value = this.currentJsonNode[key];
            return {
                key,
                value,
                type: this.getValueType(value),
                expandable: this.isExpandable(value),
                preview: this.getValuePreview(value)
            };
        });
    }

    getObjectKeys(obj: any): string[] {
        if (!obj || typeof obj !== 'object') return [];
        return Object.keys(obj);
    }

    getValuePreview(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"`;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value.toString();
        if (Array.isArray(value)) return `[Array: ${value.length} items]`;
        if (typeof value === 'object') return '{...}';
        return String(value);
    }

    getValueType(value: any): string {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    onClose(): void {
        this.close.emit();
    }
}



