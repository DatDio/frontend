import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // On SSR: block prerendering of admin pages (they require auth, no SEO value)
  if (!isPlatformBrowser(platformId)) {
    return of(false);
  }

  // On Browser: wait for auth to be ready, then check
  return authService.waitForAuthReady().pipe(
    map(() => {
      if (authService.isAuthenticated() && authService.isAdmin()) {
        return true;
      }

      if (authService.isAuthenticated()) {
        // Authenticated but not admin - redirect to home
        return router.parseUrl('/');
      }

      // Not authenticated - redirect to login
      return router.parseUrl(`/auth/login?returnUrl=${encodeURIComponent(state.url)}`);
    })
  );
};
