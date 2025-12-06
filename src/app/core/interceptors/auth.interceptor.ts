import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { throwError, BehaviorSubject, Observable, EMPTY } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

const addToken = (request: any, token: string) => {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
};

const handle401Error = (request: any, next: any, authService: AuthService): Observable<HttpEvent<any>> => {
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

export const authInterceptor: HttpInterceptorFn = (request, next): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  if (token) {
    request = addToken(request, token);
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !request.url.includes('/auth/login')) {
        return handle401Error(request, next, authService);
      }
      return throwError(() => error);
    })
  );
};
