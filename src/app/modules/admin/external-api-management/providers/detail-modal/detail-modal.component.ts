import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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

    // JSON Path Picker state
    sampleItem: any = null;
    sampleItemRaw: string = '';
    rawResponse: string = '';
    showJsonPicker = false;
    showRawJson = false;
    showPasteJson = false;
    pasteJsonText = '';
    activePathField: string | null = null;

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

    ngOnInit(): void {
        this.initForm();
    }

    private resetPreview(): void {
        this.lastPreviewPath = null;
        this.lastPreviewValue = null;
        this.lastPreviewError = null;
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
            productListDataPath: new FormControl(this.provider?.productListDataPath || ''),
            productIdPath: new FormControl(this.provider?.productIdPath || ''),
            productNamePath: new FormControl(this.provider?.productNamePath || ''),
            productPricePath: new FormControl(this.provider?.productPricePath || ''),
            productStockPath: new FormControl(this.provider?.productStockPath || ''),

            // Order API
            orderMethod: new FormControl(this.provider?.orderMethod || 'POST'),
            orderPath: new FormControl(this.provider?.orderPath || ''),
            orderBodyTemplate: new FormControl(this.provider?.orderBodyTemplate || ''),
            orderDataPath: new FormControl(this.provider?.orderDataPath || ''),
            orderSuccessPath: new FormControl(this.provider?.orderSuccessPath || ''),
            orderSuccessValue: new FormControl(this.provider?.orderSuccessValue || ''),

            // Balance API
            balancePath: new FormControl(this.provider?.balancePath || ''),
            balanceValuePath: new FormControl(this.provider?.balanceValuePath || ''),

            // Sync
            syncIntervalSeconds: new FormControl(this.provider?.syncIntervalSeconds || 300),
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
    }

    onTabChange(tab: 'basic' | 'product' | 'order' | 'balance'): void {
        this.activeTab = tab;
        this.activeJsonTab = 'input'; // Reset sub-tab
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

    onSubmit(): void {
        if (this.form.invalid) {
            this.notificationService.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        this.loading = true;
        const data = this.form.getRawValue();

        // Add custom field mappings as JSON
        const validCustomFields = this.customFields.filter(f => f.name && f.path);
        data.customFieldMappings = validCustomFields.length > 0
            ? JSON.stringify(validCustomFields)
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

    testBalanceApi(): void {
        if (this.isCreateMode) {
            this.notificationService.error('Vui lòng lưu provider trước khi test');
            return;
        }

        this.loading = true;
        this.externalApiService.getBalance(this.provider!.id!).subscribe({
            next: (response: any) => {
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
                }
                this.loading = false;
            },
            error: (error: any) => {
                this.notificationService.error('Lỗi khi gọi Balance API');
                this.loading = false;
            }
        });
    }

    async testOrderApi(): Promise<void> {
        if (this.isCreateMode) {
            this.notificationService.error('Vui lòng lưu provider trước khi test');
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
            message: 'Đây là TEST THẬT! Đơn hàng sẽ được đặt thật và có thể TỐN TIỀN! Bạn có chắc muốn tiếp tục?',
            confirmText: 'Đặt thử',
            cancelText: 'Hủy bỏ',
            confirmButtonClass: 'btn-danger'
        });

        if (!confirmed) {
            return;
        }

        this.loading = true;
        this.externalApiService.placeTestOrder(this.provider!.id!, productId, 1).subscribe({
            next: (response: any) => {
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
                }
                this.loading = false;
            },
            error: (error: any) => {
                // Still try to show the error response for debugging
                if (error?.error) {
                    this.rawResponse = JSON.stringify(error.error, null, 2);
                    this.sampleItem = error.error;
                    this.currentJsonNode = error.error;
                    this.currentJsonPath = [];
                    this.expandedNodes.clear();
                    this.resetPreview();
                    this.showJsonPicker = true;
                }
                this.notificationService.error('Lỗi khi gọi Order API: ' + (error?.error?.message || error?.message));
                this.loading = false;
            }
        });
    }

    onFetchProducts(): void {
        if (this.isCreateMode) {
            this.notificationService.error('Vui lòng lưu provider trước');
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

        this.externalApiService.fetchExternalProductsWithRaw(this.provider!.id!).subscribe({
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
                this.loadingProducts = false;
            },
            error: (error: any) => {
                this.fetchError = error?.error?.message || error?.message || 'Lỗi không xác định';
                this.notificationService.error('Lỗi khi lấy danh sách sản phẩm');
                this.loadingProducts = false;
            }
        });
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
            } else {
                path += '.' + segment;
            }
        }

        // Add the new key
        if (key.startsWith('[')) {
            path += key;
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

        // Check if this is a custom field (format: custom_N)
        if (this.activePathField.startsWith('custom_')) {
            const index = Number.parseInt(this.activePathField.replace('custom_', ''), 10);
            if (!Number.isNaN(index) && this.customFields[index]) {
                this.customFields[index].path = path;
            }
        } else {
            this.form.get(this.activePathField)?.setValue(path);
        }

        // Update preview for the selected path
        this.updatePreview(path);

        this.notificationService.success(`Đã chọn: ${path}`);
        this.activePathField = null;
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

        // Nếu nhiều node, trả về mảng; nếu một node, trả về chính nó
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
