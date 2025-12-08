import { Component, OnInit, inject, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RankService } from '../../../../core/services/rank.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Rank, RankCreate, RankUpdate } from '../../../../core/models/rank.model';
import { STATUS_ENUM, STATUS_OPTIONS } from '../../../../core/enums/status.enum';

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

    ngOnInit(): void {
        this.initForm();
    }

    private initForm(): void {
        this.form = this.#formBuilder.group({
            name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
            bonusPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
            minDeposit: [0, [Validators.required, Validators.min(0)]],
            periodDays: [7, [Validators.required, Validators.min(1)]],
            displayOrder: [0, [Validators.required, Validators.min(0)]],
            iconUrl: [''],
            color: ['#6c757d'],
            status: [STATUS_ENUM.ACTIVE, Validators.required]
        });

        if (this.mode === 'update' && this.rank) {
            this.form.patchValue({
                name: this.rank.name,
                bonusPercent: this.rank.bonusPercent,
                minDeposit: this.rank.minDeposit,
                periodDays: this.rank.periodDays,
                displayOrder: this.rank.displayOrder,
                iconUrl: this.rank.iconUrl || '',
                color: this.rank.color || '#6c757d',
                status: String(this.rank.status)
            });
        }
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.#notificationService.warning('Vui lòng điền đầy đủ thông tin hợp lệ');
            this.submitted = true;
            return;
        }

        this.submitted = true;
        this.loading = true;

        const formValue = this.form.value;

        if (this.mode === 'create') {
            const request: RankCreate = {
                name: formValue.name.trim(),
                bonusPercent: formValue.bonusPercent,
                minDeposit: formValue.minDeposit,
                periodDays: formValue.periodDays,
                displayOrder: formValue.displayOrder,
                iconUrl: formValue.iconUrl?.trim() || undefined,
                color: formValue.color || undefined
            };

            this.#rankService.create(request).subscribe({
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

            const request: RankUpdate = {
                name: formValue.name.trim(),
                bonusPercent: formValue.bonusPercent,
                minDeposit: formValue.minDeposit,
                periodDays: formValue.periodDays,
                displayOrder: formValue.displayOrder,
                iconUrl: formValue.iconUrl?.trim() || undefined,
                color: formValue.color || undefined,
                status: Number(formValue.status)
            };

            this.#rankService.update(this.rank.id, request).subscribe({
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
    get periodDays() { return this.form.get('periodDays'); }
    get displayOrder() { return this.form.get('displayOrder'); }
    get status() { return this.form.get('status'); }
}
