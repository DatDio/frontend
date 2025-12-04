import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../../core/services/loader.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isLoading) {
      <div class="loader-overlay" [@fadeIn]>
        <div class="loader-container">
          <div class="loader-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <p class="loader-text">Đang tải...</p>
        </div>
      </div>
    }
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 15, 26, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease-out;
    }

    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: white;
      padding: 2.5rem 3.5rem;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .loader-spinner {
      position: relative;
      width: 50px;
      height: 50px;
    }

    .spinner-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 3px solid transparent;
      animation: spin 1.2s linear infinite;
    }

    .spinner-ring:nth-child(1) {
      border-top-color: #0066CC;
      animation-delay: 0s;
    }

    .spinner-ring:nth-child(2) {
      border-right-color: #3399FF;
      animation-delay: 0.15s;
    }

    .spinner-ring:nth-child(3) {
      border-bottom-color: #0066CC;
      animation-delay: 0.3s;
      width: 70%;
      height: 70%;
      top: 15%;
      left: 15%;
    }

    .loader-text {
      margin-top: 1.5rem;
      color: #1a1a2e;
      font-weight: 500;
      font-size: 0.875rem;
      letter-spacing: 0.5px;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class LoaderComponent implements OnInit, OnDestroy {
  isLoading = false;
  private readonly destroy$ = new Subject<void>();
  readonly #loaderService = inject(LoaderService);

  ngOnInit(): void {
    // Debounce loading state to prevent flicker on quick requests
    this.#loaderService.loading$
      .pipe(
        debounceTime(100), // Wait 100ms before showing/hiding
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((loading: boolean) => {
        this.isLoading = loading;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
