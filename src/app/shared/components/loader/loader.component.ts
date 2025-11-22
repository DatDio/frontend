import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../../core/services/loader.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isLoading) {
      <div class="loader-overlay">
        <div class="loader-container">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="loader-text mt-3">Loading...</p>
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
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    }

    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: white;
      padding: 2rem 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }

    .spinner-border {
      width: 3rem;
      height: 3rem;
      border-width: 0.3rem;
    }

    .loader-text {
      color: #333;
      font-weight: 500;
      margin: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .loader-overlay {
      animation: fadeIn 0.2s ease-in;
    }
  `]
})
export class LoaderComponent implements OnInit, OnDestroy {
  isLoading = false;
  private readonly destroy$ = new Subject<void>();
  readonly #loaderService = inject(LoaderService);

  ngOnInit(): void {
    this.#loaderService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading: boolean) => {
        this.isLoading = loading;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
