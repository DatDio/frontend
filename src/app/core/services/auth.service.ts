import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, finalize, catchError } from 'rxjs/operators';
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

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
    }
  }

  // ========= LOGIN =========
  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    this.loaderService.show();

    return this.httpClient
      .post<ApiResponse<LoginResponse>>(AuthApi.LOGIN, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuthData(response.data);
          }
        }),
        finalize(() => this.loaderService.hide())
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

  // ========= REFRESH TOKEN =========
  refreshToken(): Observable<ApiResponse<{ accessToken: string }>> {
    const refreshToken = this.getRefreshToken();

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

  // ========= LOGOUT =========
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
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

  getAccessToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  // ========= INTERNAL METHODS =========
  private setAuthData(data: LoginResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    }

    this.currentUserSubject.next(data.user);
    this.isAuthenticatedSubject.next(true);
  }

  private setAccessToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('accessToken', token);
    }
  }

  private loadUserFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const userJson = localStorage.getItem('currentUser');
    const token = localStorage.getItem('accessToken');

    if (userJson && token) {
      try {
        const user = JSON.parse(userJson) as User;
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch {
        this.logout();
      }
    }
  }
}
