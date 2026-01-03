import { Component, Input, Output, EventEmitter, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-prompt-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="prompt-modal-overlay" (click)="onOverlayClick($event)">
      <div class="prompt-modal-content">
        <div class="prompt-modal-header">
          <h5 class="prompt-modal-title">{{ title }}</h5>
        </div>
        <div class="prompt-modal-body">
          <p class="prompt-message" [innerHTML]="message"></p>
          <div class="prompt-input-wrapper">
            <label *ngIf="inputLabel" class="prompt-label">{{ inputLabel }}</label>
            <textarea
              #inputElement
              class="prompt-input"
              [(ngModel)]="inputValue"
              [placeholder]="placeholder"
              [rows]="rows"
              (keydown.enter)="onEnterKey($event)"
            ></textarea>
          </div>
        </div>
        <div class="prompt-modal-footer">
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
    .prompt-modal-overlay {
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

    .prompt-modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-width: 450px;
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

    .prompt-modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e9ecef;
    }

    .prompt-modal-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
    }

    .prompt-modal-body {
      padding: 1.5rem;
    }

    .prompt-message {
      margin: 0 0 1rem 0;
      color: #555;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .prompt-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .prompt-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #495057;
    }

    .prompt-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
    }

    .prompt-input:focus {
      outline: none;
      border-color: #86b7fe;
      box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
    }

    .prompt-input::placeholder {
      color: #adb5bd;
    }

    .prompt-modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .prompt-modal-footer .btn {
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .prompt-modal-footer .btn-secondary {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      color: #495057;
    }

    .prompt-modal-footer .btn-secondary:hover {
      background-color: #e9ecef;
    }

    .prompt-modal-footer .btn-danger {
      background-color: #dc3545;
      border: 1px solid #dc3545;
      color: white;
    }

    .prompt-modal-footer .btn-danger:hover {
      background-color: #bb2d3b;
    }

    .prompt-modal-footer .btn-primary {
      background-color: #0d6efd;
      border: 1px solid #0d6efd;
      color: white;
    }

    .prompt-modal-footer .btn-primary:hover {
      background-color: #0b5ed7;
    }

    .prompt-modal-footer .btn-success {
      background-color: #198754;
      border: 1px solid #198754;
      color: white;
    }

    .prompt-modal-footer .btn-success:hover {
      background-color: #157347;
    }
  `]
})
export class PromptModalComponent implements AfterViewInit {
    @ViewChild('inputElement') inputElement!: ElementRef<HTMLTextAreaElement>;

    @Input() title = 'Nhập thông tin';
    @Input() message = '';
    @Input() inputLabel = '';
    @Input() placeholder = '';
    @Input() defaultValue = '';
    @Input() confirmText = 'Xác nhận';
    @Input() cancelText = 'Hủy';
    @Input() confirmButtonClass = 'btn-primary';
    @Input() rows = 3;
    @Input() required = false;

    @Output() submitted = new EventEmitter<string>();
    @Output() cancelled = new EventEmitter<void>();

    inputValue = '';

    ngAfterViewInit(): void {
        this.inputValue = this.defaultValue;
        // Focus input after view init
        setTimeout(() => {
            this.inputElement?.nativeElement?.focus();
        }, 100);
    }

    onConfirm(): void {
        if (this.required && !this.inputValue.trim()) {
            return;
        }
        this.submitted.emit(this.inputValue);
    }

    onCancel(): void {
        this.cancelled.emit();
    }

    onEnterKey(event: Event): void {
        // Allow Shift+Enter for new line
        if (!(event as KeyboardEvent).shiftKey) {
            event.preventDefault();
            this.onConfirm();
        }
    }

    onOverlayClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('prompt-modal-overlay')) {
            this.onCancel();
        }
    }
}
