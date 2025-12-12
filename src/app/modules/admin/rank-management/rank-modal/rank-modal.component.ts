import { Component, OnInit, inject, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RankService } from '../../../../core/services/rank.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Rank } from '../../../../core/models/rank.model';
import { STATUS_ENUM, STATUS_OPTIONS } from '../../../../core/enums/status.enum';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-rank-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './rank-modal.component.html',
    styleUrls: ['./rank-modal.component.scss']
})
export class RankModalComponent implements OnInit {
    readonly #rankService = inject(RankService);
    readonly #notificationService = inject(NotificationService);
    readonly #formBuilder = inject(FormBuilder);

    @Input() mode: 'create' | 'update' = 'create';
    @Input() rank: Rank | null = null;
    @Output() closed = new EventEmitter<Rank | null>();

    form!: FormGroup;
    loading = false;
    submitted = false;
    readonly statusOptions = STATUS_OPTIONS;
    readonly statusEnum = STATUS_ENUM;

    // Icon upload
    iconPreview: string | null = null;
    iconFile: File | null = null;

    ngOnInit(): void {
        this.initForm();
    }

    private initForm(): void {
        this.form = this.#formBuilder.group({
            name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
            bonusPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
            minDeposit: [0, [Validators.required, Validators.min(0)]],
            color: ['#6c757d'],
            status: [STATUS_ENUM.ACTIVE, Validators.required]
        });

        if (this.mode === 'update' && this.rank) {
            this.form.patchValue({
                name: this.rank.name,
                bonusPercent: this.rank.bonusPercent,
                minDeposit: this.rank.minDeposit,
                color: this.rank.color || '#6c757d',
                status: String(this.rank.status)
            });
            // Set preview for existing icon (prepend backend URL for relative paths)
            if (this.rank.iconUrl) {
                this.iconPreview = this.getFullImageUrl(this.rank.iconUrl);
            }
        }
    }

    /**
     * Convert relative iconUrl to full URL
     */
    private getFullImageUrl(iconUrl: string): string {
        if (!iconUrl) return '';
        // If already a full URL, return as is
        if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
            return iconUrl;
        }
        // Prepend backend base URL for relative paths
        return environment.apiBaseUrl + iconUrl;
    }

    onIconSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) {
                this.#notificationService.error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp, svg)');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.#notificationService.error('Kích thước file không được vượt quá 5MB');
                return;
            }

            this.iconFile = file;
            // Create preview URL
            this.iconPreview = URL.createObjectURL(file);
        }
    }

    removeIcon(): void {
        this.iconFile = null;
        this.iconPreview = null;
    }

    private buildFormData(): FormData {
        const formData = new FormData();
        const formValue = this.form.value;

        formData.append('name', formValue.name.trim());
        formData.append('bonusPercent', formValue.bonusPercent.toString());
        formData.append('minDeposit', formValue.minDeposit.toString());

        if (formValue.color) {
            formData.append('color', formValue.color);
        }

        if (this.mode === 'update') {
            formData.append('status', formValue.status.toString());
        }

        // Append icon file if selected
        if (this.iconFile) {
            formData.append('icon', this.iconFile);
        }

        return formData;
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.#notificationService.warning('Vui lòng điền đầy đủ thông tin hợp lệ');
            this.submitted = true;
            return;
        }

        this.submitted = true;
        this.loading = true;

        const formData = this.buildFormData();

        if (this.mode === 'create') {
            this.#rankService.create(formData).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.#notificationService.success('Tạo thứ hạng thành công');
                        this.closed.emit(response.data);
                    } else {
                        this.#notificationService.error(response.message || 'Có lỗi xảy ra');
                    }
                    this.loading = false;
                },
                error: (error) => {
                    this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
                    this.loading = false;
                }
            });
        } else {
            if (!this.rank) return;

            this.#rankService.update(this.rank.id, formData).subscribe({
                next: (response) => {
                    if (response.success) {
                        this.#notificationService.success('Cập nhật thứ hạng thành công');
                        this.closed.emit(response.data);
                    } else {
                        this.#notificationService.error(response.message || 'Có lỗi xảy ra');
                    }
                    this.loading = false;
                },
                error: (error) => {
                    this.#notificationService.error(error.error?.message || 'Có lỗi xảy ra');
                    this.loading = false;
                }
            });
        }
    }

    onCancel(): void {
        this.closed.emit(null);
    }

    get name() { return this.form.get('name'); }
    get bonusPercent() { return this.form.get('bonusPercent'); }
    get minDeposit() { return this.form.get('minDeposit'); }
    get status() { return this.form.get('status'); }
}
