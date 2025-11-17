import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  // Temporarily disabled for development
  return true;
  
  // const authService = inject(AuthService);
  // const router = inject(Router);

  // if (authService.isAuthenticated() && authService.isAdmin()) {
  //   return true;
  // }

  // if (authService.isAuthenticated()) {
  //   router.navigate(['/']);
  // } else {
  //   router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  // }
  
  // return false;
};
