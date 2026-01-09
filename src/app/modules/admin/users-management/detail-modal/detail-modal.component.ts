import { Component, OnInit, inject, ElementRef, ViewChild, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User, UpdateUserRequest } from '../../../../core/models/user.model';
import { ActiveStatusBadgeComponent } from '../../../../shared/components/active-status-badge/active-status-badge.component';
declare const window: any;

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [CommonModule, ActiveStatusBadgeComponent, FormsModule],
  templateUrl: './detail-modal.component.html',
  styleUrls: ['./detail-modal.component.scss']
})
export class UserDetailModalComponent implements OnInit {
  @ViewChild('userDetailModal') modalElement!: ElementRef;
  @Output() userUpdated = new EventEmitter<void>();

  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  user: User | null = null;
  loading = false;
  private modal: any = null;

  // Collaborator fields
  isCollaborator = false;
  bonusPercent = 0;
  savingCollaborator = false;

  ngOnInit(): void { }

  openModal(userId: number): void {
    this.loading = true;
    this.user = null;

    this.userService.getById(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.user = response.data;
          // Sync collaborator fields
          this.isCollaborator = this.user.isCollaborator ?? false;
          this.bonusPercent = this.user.bonusPercent ?? 0;
          this.showModal();
        } else {
          this.notificationService.error(response.message || 'Có lỗi xảy ra');
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Có lỗi xảy ra');
        this.loading = false;
      }
    });
  }

  private showModal(): void {
    if (this.modalElement) {
      this.modal = new window.bootstrap.Modal(this.modalElement.nativeElement);
      this.modal.show();
    }
  }

  closeModal(): void {
    if (this.modal) {
      this.modal.hide();
      this.modal = null;
    }
    this.user = null;
  }

  getProgressPercent(): number {
    if (!this.user?.rank?.nextRankMinDeposit) return 0;
    const current = this.user.rank.currentDeposit || 0;
    const target = this.user.rank.nextRankMinDeposit;
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  onCollaboratorChange(): void {
    if (!this.isCollaborator) {
      this.bonusPercent = 0;
    }
  }

  saveCollaborator(): void {
    if (!this.user) return;

    this.savingCollaborator = true;

    const request: UpdateUserRequest = {
      id: this.user.id,
      email: this.user.email,
      fullName: this.user.fullName,
      status: this.user.status,
      isCollaborator: this.isCollaborator,
      bonusPercent: this.isCollaborator ? this.bonusPercent : 0
    };

    this.userService.update(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Cập nhật cộng tác viên thành công');
          // Update local user object
          if (this.user) {
            this.user.isCollaborator = this.isCollaborator;
            this.user.bonusPercent = this.bonusPercent;
          }
          this.userUpdated.emit();
        } else {
          this.notificationService.error(response.message || 'Cập nhật thất bại');
        }
        this.savingCollaborator = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Có lỗi xảy ra');
        this.savingCollaborator = false;
      }
    });
  }
}

