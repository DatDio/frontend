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

  success(content: string, duration: number = 3000): void {
    this.show({
      title: 'Thành công',
      content,
      status: NOTI_TYPE_ENUM.SUCCESS,
      isShowBtn: false,
      duration
    });
  }

  error(content: string, duration: number = 4000): void {
    this.show({
      title: 'Lỗi',
      content,
      status: NOTI_TYPE_ENUM.ERROR,
      isShowBtn: false,
      duration
    });
  }

  warning(content: string, duration: number = 3500): void {
    this.show({
      title: 'Cảnh báo',
      content,
      status: NOTI_TYPE_ENUM.WARNING,
      isShowBtn: false,
      duration
    });
  }

  info(content: string, duration: number = 3000): void {
    this.show({
      title: 'Thông tin',
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
