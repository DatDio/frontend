import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ACTIVE_STATUS_ENUM } from '../../../Utils/enums/commom.enum';

@Component({
  selector: 'app-active-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge px-3 py-2"
          [ngClass]="badgeClass">
      {{ label }}
    </span>
  `
})
export class ActiveStatusBadgeComponent {

  @Input() status!: number;

  get label(): string {
    switch (this.status) {
      case ACTIVE_STATUS_ENUM.ACTIVE:
        return 'Hoạt động';
      case ACTIVE_STATUS_ENUM.IN_ACTIVE:
        return 'Không hoạt động';
      default:
        return 'Không xác định';
    }
  }

  get badgeClass(): string {
    switch (this.status) {
      case ACTIVE_STATUS_ENUM.ACTIVE:
        return 'bg-success';
      case ACTIVE_STATUS_ENUM.IN_ACTIVE:
        return 'bg-secondary';
      default:
        return 'bg-dark';
    }
  }
}
