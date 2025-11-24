import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { ACTIVE_STATUS_ENUM } from '../../../Utils/enums/commom.enum';

@Component({
  selector: 'app-active-status-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <select
      [value]="selectedValue"
      (change)="onStatusChange($event)"
      [class]="inputClass"
      [disabled]="isDisabled">
      <option value="">{{ placeholder }}</option>
      <option [value]="ACTIVE_STATUS_ENUM.ACTIVE">{{ activeLabel }}</option>
      <option [value]="ACTIVE_STATUS_ENUM.IN_ACTIVE">{{ inactiveLabel }}</option>
    </select>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ActiveStatusSelectComponent),
      multi: true
    }
  ]
})
export class ActiveStatusSelectComponent implements ControlValueAccessor {
  @Input() placeholder = 'Tất cả trạng thái';
  @Input() activeLabel = 'Hoạt động';
  @Input() inactiveLabel = 'Không hoạt động';
  @Input() inputClass = 'form-select';

  ACTIVE_STATUS_ENUM = ACTIVE_STATUS_ENUM;
  selectedValue: string = '';
  isDisabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.selectedValue = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedValue = target.value;
    this.onChange(this.selectedValue);
    this.onTouched();
  }
}
