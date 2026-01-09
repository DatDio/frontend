import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpRequest } from '@angular/common/http';
import { throwError, BehaviorSubject, Observable, EMPTY } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

const addToken = (request: HttpRequest<any>, token: string): HttpRequest<any> => {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
};

/**
 * Get current language from localStorage directly.
 * Avoids circular dependency with LanguageService which uses TranslateService -> HttpClient.
 */
const getCurrentLanguage = (platformId: Object): string => {
  if (isPlatformBrowser(platformId)) {
    const savedLang = localStorage.getItem('preferred_language');
    if (savedLang === 'vi' || savedLang === 'en') {
      return savedLang;
    }
  }
  return 'vi'; // Default language
};

/**
 * Add Accept-Language header to API requests.
 * This allows the backend to return localized messages.
 * Note: Users can also use ?lang= query param for API integration (e.g., tools, scripts).
 */
const addLanguageHeader = (request: HttpRequest<any>, lang: string): HttpRequest<any> => {
  // Only add header to API requests (not static assets)
  if (request.url.includes('/api/')) {
    return request.clone({
      setHeaders: {
        'Accept-Language': lang
      }
    });
  }
  return request;
};

const handle401Error = (request: HttpRequest<any>, next: any, authService: AuthService): Observable<HttpEvent<any>> => {
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => next(addToken(request, token)) as Observable<HttpEvent<any>>)
    );
  }

  // No refresh token available, force logout and fail fast
  if (!authService.getRefreshToken()) {
    authService.logout();
    return EMPTY;
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return authService.refreshToken().pipe(
    switchMap((response) => {
      isRefreshing = false;
      if (response.success && response.data) {
        refreshTokenSubject.next(response.data.accessToken);
        return next(addToken(request, response.data.accessToken)) as Observable<HttpEvent<any>>;
      }
      authService.logout();
      return throwError(() => new Error('Token refresh failed')) as Observable<HttpEvent<any>>;
    }),
    catchError((err) => {
      isRefreshing = false;
      authService.logout();
      return throwError(() => err);
    })
  );
};

/**
 * Auth interceptor that:
 * 1. Adds JWT token to Authorization header
 * 2. Adds Accept-Language header to API requests
 * 3. Handles 401 errors with token refresh
 */
export const authInterceptor: HttpInterceptorFn = (request, next): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  const token = authService.getAccessToken();
  const currentLang = getCurrentLanguage(platformId);

  // Add auth token if available
  if (token) {
    request = addToken(request, token);
  }

  // Add Accept-Language header for API requests
  request = addLanguageHeader(request, currentLang);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !request.url.includes('/auth/login')) {
        return handle401Error(request, next, authService);
      }
      return throwError(() => error);
    })
  );
};

