import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirm-modal-overlay">
      <div class="confirm-modal-content">
        <div class="confirm-modal-header">
          <h5 class="confirm-modal-title">{{ title }}</h5>
        </div>
        <div class="confirm-modal-body">
          <p [innerHTML]="message"></p>
        </div>
        <div class="confirm-modal-footer">
          <button type="button" class="btn btn-secondary" (click)="onCancel()">
            {{ cancelText }}
          </button>
          <button type="button" class="btn" [ngClass]="confirmButtonClass" (click)="onConfirm()">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .confirm-modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-width: 400px;
      width: 90%;
      animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .confirm-modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e9ecef;
    }

    .confirm-modal-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
    }

    .confirm-modal-body {
      padding: 1.5rem;
    }

    .confirm-modal-body p {
      margin: 0;
      color: #555;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .confirm-modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .confirm-modal-footer .btn {
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .confirm-modal-footer .btn-secondary {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      color: #495057;
    }

    .confirm-modal-footer .btn-secondary:hover {
      background-color: #e9ecef;
    }

    .confirm-modal-footer .btn-danger {
      background-color: #dc3545;
      border: 1px solid #dc3545;
      color: white;
    }

    .confirm-modal-footer .btn-danger:hover {
      background-color: #bb2d3b;
    }

    .confirm-modal-footer .btn-primary {
      background-color: #0d6efd;
      border: 1px solid #0d6efd;
      color: white;
    }

    .confirm-modal-footer .btn-primary:hover {
      background-color: #0b5ed7;
    }

    .confirm-modal-footer .btn-success {
      background-color: #198754;
      border: 1px solid #198754;
      color: white;
    }

    .confirm-modal-footer .btn-success:hover {
      background-color: #157347;
    }
  `]
})
export class ConfirmModalComponent {
  @Input() title = 'Xác nhận';
  @Input() message = '';
  @Input() confirmText = 'Xác nhận';
  @Input() cancelText = 'Hủy';
  @Input() confirmButtonClass = 'btn-danger';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
