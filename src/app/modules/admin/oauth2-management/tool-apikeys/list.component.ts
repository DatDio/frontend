import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToolApiKey, ToolApiKeyCreate, ToolApiKeyGenerated } from '../../../../core/models/tool-apikey.model';
import { ToolApiKeyService } from '../../../../core/services/tool-apikey.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';

@Component({
    selector: 'app-tool-apikey-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss'
})
export class ToolApiKeyListComponent implements OnInit {
    private readonly toolApiKeyService = inject(ToolApiKeyService);
    private readonly notificationService = inject(NotificationService);
    private readonly confirmService = inject(ConfirmService);
    private readonly fb = inject(FormBuilder);

    toolApiKeys: ToolApiKey[] = [];
    showCreateModal = false;
    showKeyModal = false;
    generatedKey: ToolApiKeyGenerated | null = null;
    formCreate!: FormGroup;
    isLoading = false;

    ngOnInit(): void {
        this.initForm();
        this.loadToolApiKeys();
    }

    private initForm(): void {
        this.formCreate = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(100)]],
            description: ['', Validators.maxLength(500)]
        });
    }

    loadToolApiKeys(): void {
        this.isLoading = true;
        this.toolApiKeyService.getAll().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.toolApiKeys = response.data;
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

    onOpenCreateModal(): void {
        this.initForm();
        this.showCreateModal = true;
    }

    onCloseCreateModal(): void {
        this.showCreateModal = false;
    }

    onCloseKeyModal(): void {
        this.showKeyModal = false;
        this.generatedKey = null;
    }

    onCreate(): void {
        if (this.formCreate.invalid) {
            this.notificationService.warning('Vui lòng nhập tên Tool API Key');
            return;
        }

        const request: ToolApiKeyCreate = {
            name: this.formCreate.get('name')?.value,
            description: this.formCreate.get('description')?.value || undefined
        };

        this.toolApiKeyService.create(request).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.generatedKey = response.data;
                    this.showCreateModal = false;
                    this.showKeyModal = true;
                    this.loadToolApiKeys();
                    this.notificationService.success('Tạo Tool API Key thành công!');
                }
            },
            error: (error) => {
                console.error('Error creating tool API key:', error);
                this.notificationService.error(error?.error?.message || 'Lỗi khi tạo Tool API Key');
            }
        });
    }

    async onRevoke(key: ToolApiKey): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận vô hiệu hóa',
            message: `Vô hiệu hóa Tool API Key "${key.name}"? Desktop Tool sử dụng key này sẽ không thể truy cập API.`,
            confirmText: 'Vô hiệu hóa',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            this.toolApiKeyService.revoke(key.id).subscribe({
                next: () => {
                    this.notificationService.success('Đã vô hiệu hóa Tool API Key');
                    this.loadToolApiKeys();
                },
                error: () => this.notificationService.error('Lỗi khi vô hiệu hóa')
            });
        }
    }

    async onActivate(key: ToolApiKey): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận kích hoạt',
            message: `Kích hoạt lại Tool API Key "${key.name}"?`,
            confirmText: 'Kích hoạt',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            this.toolApiKeyService.activate(key.id).subscribe({
                next: () => {
                    this.notificationService.success('Đã kích hoạt lại Tool API Key');
                    this.loadToolApiKeys();
                },
                error: () => this.notificationService.error('Lỗi khi kích hoạt')
            });
        }
    }

    async onDelete(key: ToolApiKey): Promise<void> {
        const confirmed = await this.confirmService.confirm({
            title: 'Xác nhận xóa',
            message: `Xóa vĩnh viễn Tool API Key "${key.name}"? Hành động này không thể hoàn tác.`,
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            this.toolApiKeyService.delete(key.id).subscribe({
                next: () => {
                    this.notificationService.success('Đã xóa Tool API Key');
                    this.loadToolApiKeys();
                },
                error: () => this.notificationService.error('Lỗi khi xóa')
            });
        }
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
}
