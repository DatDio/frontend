import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, finalize, catchError, filter, take } from 'rxjs/operators';
import { Router } from '@angular/router';

import { LoaderService } from './loader.service';
import { User, LoginRequest, LoginResponse, RegisterRequest } from '../models/user.model';
import { ApiResponse } from '../models/common.model';
import { AuthApi } from '../../Utils/apis/auth.api';
import { Role } from '../../Utils/enums/commom.enum';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly httpClient = inject(HttpClient);
  private readonly loaderService = inject(LoaderService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Track if we're in browser and auth check is complete
  // This stays FALSE on SSR so we don't render auth-dependent UI on server
  private authReadySubject = new BehaviorSubject<boolean>(false);
  public authReady$ = this.authReadySubject.asObservable();

  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      // Only load from storage in browser
      this.loadUserFromStorage();
    }
    // On SSR: authReady$ stays false, so no auth-dependent UI is rendered
  }

  /**
   * Wait for auth to be ready (browser only).
   * On SSR this never resolves - guards should handle SSR differently.
   */
  waitForAuthReady(): Observable<boolean> {
    // If not in browser, return true immediately to not block SSR
    if (!this.isBrowser) {
      return of(true);
    }
    return this.authReady$.pipe(
      filter(ready => ready),
      take(1)
    );
  }

  /**
   * Check if we're in browser
   */
  isInBrowser(): boolean {
    return this.isBrowser;
  }

  // ========= LOGIN =========
  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.httpClient
      .post<ApiResponse<LoginResponse>>(AuthApi.LOGIN, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuthData(response.data);
          }
        })
      );
  }

  // ========= REGISTER =========
  register(data: RegisterRequest): Observable<ApiResponse<LoginResponse>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<LoginResponse>>(AuthApi.REGISTER, data)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuthData(response.data);
          }
        }),
        finalize(() => this.loaderService.hide())
      );
  }
  // ===== CHANGE PASSWORD =====
  changePassword(data: { currentPassword: string; newPassword: string }): Observable<ApiResponse<void>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<void>>(AuthApi.CHANGE_PASSWORD, data)
      .pipe(
        finalize(() => this.loaderService.hide())
      );
  }
  // ========= REFRESH TOKEN =========
  refreshToken(): Observable<ApiResponse<{ accessToken: string }>> {
    const refreshToken = this.getRefreshToken();

    // If there is no refresh token in storage, bail out early
    if (!refreshToken) {
      this.logout();
      return of({ success: false, data: { accessToken: '' } });
    }

    return this.httpClient
      .post<ApiResponse<{ accessToken: string }>>(AuthApi.REFRESH, { refreshToken })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAccessToken(response.data.accessToken);
          }
        }),
        catchError(() => {
          this.logout();
          return of({ success: false, data: { accessToken: '' } });
        })
      );
  }

  // ========= GOOGLE LOGIN =========
  googleLogin(idToken: string): Observable<ApiResponse<LoginResponse>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<LoginResponse>>(AuthApi.GOOGLE_LOGIN, { idToken })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuthData(response.data);
          }
        }),
        finalize(() => this.loaderService.hide())
      );
  }

  // ========= LOGOUT =========
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
    }

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    this.router.navigate(['/auth/login']);
  }

  // ========= GETTERS =========
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    return this.getCurrentUser()?.roles?.includes(Role.ADMIN) || false;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isAuthReady(): boolean {
    return this.authReadySubject.value;
  }

  /**
   * Public restore để guard/component gọi lại khi reload.
   */
  restoreFromStorage(): void {
    if (this.isBrowser) {
      this.loadUserFromStorage();
    }
  }

  getAccessToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  // ========= INTERNAL METHODS =========
  private setAuthData(data: LoginResponse): void {
    if (this.isBrowser) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }

    this.currentUserSubject.next(data.user);
    this.isAuthenticatedSubject.next(true);
  }

  private setAccessToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('accessToken', token);
    }
  }

  private loadUserFromStorage(): void {
    if (!this.isBrowser) {
      return;
    }

    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userJson = localStorage.getItem('currentUser');

    if (token) {
      try {
        const user = userJson ? (JSON.parse(userJson) as User) : null;
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        // Mark auth as ready
        this.authReadySubject.next(true);
      } catch {
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.authReadySubject.next(true);
      }
    } else if (refreshToken) {
      // No accessToken but refreshToken exists - try to refresh
      this.tryRefreshOnStartup(userJson);
    } else {
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      // Mark auth as ready - only happens in browser after localStorage check
      this.authReadySubject.next(true);
    }
  }

  /**
   * Try to refresh token on startup when accessToken is missing but refreshToken exists
   */
  private tryRefreshOnStartup(userJson: string | null): void {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.authReadySubject.next(true);
      return;
    }

    this.httpClient
      .post<ApiResponse<{ accessToken: string }>>(AuthApi.REFRESH, { refreshToken })
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Successfully refreshed - restore session
            localStorage.setItem('accessToken', response.data.accessToken);

            try {
              const user = userJson ? (JSON.parse(userJson) as User) : null;
              this.currentUserSubject.next(user);
              this.isAuthenticatedSubject.next(true);
            } catch {
              // User data corrupted, but we have valid tokens
              this.currentUserSubject.next(null);
              this.isAuthenticatedSubject.next(true);
            }
          } else {
            // Refresh failed - clear everything
            this.clearAuthData();
          }
          this.authReadySubject.next(true);
        },
        error: () => {
          // Refresh failed - clear everything
          this.clearAuthData();
          this.authReadySubject.next(true);
        }
      });
  }

  /**
   * Clear all auth data from storage
   */
  private clearAuthData(): void {
    if (this.isBrowser) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }
}
