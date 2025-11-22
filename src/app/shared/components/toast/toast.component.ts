import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastNotification, NOTI_TYPE_ENUM } from '../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (notification) {
      <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 9999;">
        <div 
          class="toast show" 
          [class.bg-success]="notification.status === 'success'"
          [class.bg-danger]="notification.status === 'error'"
          [class.bg-warning]="notification.status === 'warning'"
          [class.bg-info]="notification.status === 'info'"
          role="alert">
          <div class="toast-header">
            <i class="bi me-2" 
               [class.bi-check-circle-fill]="notification.status === 'success'"
               [class.bi-x-circle-fill]="notification.status === 'error'"
               [class.bi-exclamation-triangle-fill]="notification.status === 'warning'"
               [class.bi-info-circle-fill]="notification.status === 'info'"></i>
            <strong class="me-auto">{{ notification.title }}</strong>
            <button type="button" class="btn-close" (click)="close()"></button>
          </div>
          <div class="toast-body text-white">
            {{ notification.content }}
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .toast {
      min-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      
      &.bg-success, &.bg-danger, &.bg-warning, &.bg-info {
        .toast-header {
          background-color: rgba(255, 255, 255, 0.95);
          border-bottom: none;
        }
      }
    }

    .toast-header {
      i {
        font-size: 1.2rem;
      }
    }

    .toast-body {
      font-size: 0.95rem;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast.show {
      animation: slideIn 0.3s ease-out;
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  notification: ToastNotification | null = null;
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        this.notification = notification;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close(): void {
    this.notificationService.hide();
  }
}
