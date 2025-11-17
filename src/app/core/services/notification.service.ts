import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum NOTI_TYPE_ENUM {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface ToastNotification {
  title: string;
  content: string;
  status: NOTI_TYPE_ENUM;
  isShowBtn?: boolean;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<ToastNotification | null>(null);
  public notification$ = this.notificationSubject.asObservable();

  show(notification: ToastNotification): void {
    this.notificationSubject.next(notification);
    
    // Auto hide after duration (default 3000ms)
    const duration = notification.duration || 3000;
    setTimeout(() => {
      this.hide();
    }, duration);
  }

  success(title: string, content: string, duration?: number): void {
    this.show({
      title,
      content,
      status: NOTI_TYPE_ENUM.SUCCESS,
      isShowBtn: false,
      duration
    });
  }

  error(title: string, content: string, duration?: number): void {
    this.show({
      title,
      content,
      status: NOTI_TYPE_ENUM.ERROR,
      isShowBtn: false,
      duration
    });
  }

  warning(title: string, content: string, duration?: number): void {
    this.show({
      title,
      content,
      status: NOTI_TYPE_ENUM.WARNING,
      isShowBtn: false,
      duration
    });
  }

  info(title: string, content: string, duration?: number): void {
    this.show({
      title,
      content,
      status: NOTI_TYPE_ENUM.INFO,
      isShowBtn: false,
      duration
    });
  }

  hide(): void {
    this.notificationSubject.next(null);
  }
}
