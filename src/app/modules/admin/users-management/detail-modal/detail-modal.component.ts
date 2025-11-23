import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User } from '../../../../core/models/user.model';

declare const window: any;

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail-modal.component.html',
  styleUrls: ['./detail-modal.component.scss']
})
export class UserDetailModalComponent implements OnInit {
  @ViewChild('userDetailModal') modalElement!: ElementRef;

  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  user: User | null = null;
  loading = false;
  private modal: any = null;

  ngOnInit(): void {}

  openModal(userId: number): void {
    this.loading = true;
    this.user = null;

    this.userService.getById(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.user = response.data;
          this.showModal();
        } else {
          this.notificationService.error(response.message || 'Failed to load user');
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'An error occurred');
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
}
