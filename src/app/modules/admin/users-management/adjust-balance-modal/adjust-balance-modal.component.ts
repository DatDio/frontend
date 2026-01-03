import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.model';

@Component({
    selector: 'app-adjust-balance-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './adjust-balance-modal.component.html',
    styleUrls: ['./adjust-balance-modal.component.scss']
})
export class AdjustBalanceModalComponent implements OnInit {
    @Input() user!: User;
    @Output() closeModal = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    private readonly fb = inject(FormBuilder);
    private readonly userService = inject(UserService);
    private readonly notificationService = inject(NotificationService);

    form!: FormGroup;
    isLoading = false;
    amountDisplay = '';

    ngOnInit(): void {
        this.initForm();
    }

    private initForm(): void {
        this.form = this.fb.group({
            type: ['add', Validators.required], // 'add' hoặc 'subtract'
            amount: [0, [Validators.required, Validators.min(1)]],
            reason: ['']
        });
    }

    get type() { return this.form.get('type'); }
    get amount() { return this.form.get('amount'); }
    get reason() { return this.form.get('reason'); }

    onAmountInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        // Remove all non-digit characters
        const rawValue = input.value.replace(/[^0-9]/g, '');

        if (rawValue) {
            const numValue = parseInt(rawValue, 10);
            this.form.patchValue({ amount: numValue });
            this.amountDisplay = this.formatNumber(numValue);
        } else {
            this.form.patchValue({ amount: 0 });
            this.amountDisplay = '';
        }

        // Update input with formatted value
        input.value = this.amountDisplay;
    }

    private formatNumber(value: number): string {
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    onClose(): void {
        this.closeModal.emit();
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.notificationService.warning('Vui lòng nhập số tiền hợp lệ');
            return;
        }

        const formValue = this.form.value;

        // Tính amount: cộng thì dương, trừ thì âm
        let finalAmount = Math.abs(formValue.amount);
        if (formValue.type === 'subtract') {
            finalAmount = -finalAmount;
        }

        this.isLoading = true;
        this.userService.adjustBalance(this.user.id, finalAmount, formValue.reason).subscribe({
            next: (response) => {
                this.isLoading = false;
                if (response.success) {
                    this.notificationService.success(response.message || 'Điều chỉnh số dư thành công');
                    this.success.emit();
                } else {
                    this.notificationService.error(response.message || 'Có lỗi xảy ra');
                }
            },
            error: (error) => {
                this.isLoading = false;
                this.notificationService.error(error.error?.message || 'Có lỗi xảy ra');
            }
        });
    }
}
