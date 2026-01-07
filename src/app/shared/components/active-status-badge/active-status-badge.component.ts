import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ACTIVE_STATUS_ENUM } from '../../../Utils/enums/commom.enum';

@Component({
  selector: 'app-active-status-badge',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <span class="badge px-3 py-2"
          [ngClass]="badgeClass">
      {{ label }}
    </span>
  `
})
export class ActiveStatusBadgeComponent {
  private translateService = inject(TranslateService);

  @Input() status!: number;
  @Input() useI18n: boolean = false; // Mặc định false để không ảnh hưởng admin

  get label(): string {
    if (this.useI18n) {
      switch (this.status) {
        case ACTIVE_STATUS_ENUM.ACTIVE:
          return this.translateService.instant('COMMON.ACTIVE');
        case ACTIVE_STATUS_ENUM.IN_ACTIVE:
          return this.translateService.instant('COMMON.INACTIVE');
        default:
          return this.translateService.instant('COMMON.UNKNOWN');
      }
    }
    // Default Vietnamese for admin
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
