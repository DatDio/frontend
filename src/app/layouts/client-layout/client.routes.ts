import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const clientRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../modules/client/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('../../modules/client/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('../../modules/client/orders/list/list.component').then(m => m.ClientOrderListComponent)
  },
  {
    path: 'transactions',
    canActivate: [authGuard],
    loadComponent: () => import('../../modules/client/transactions/list/list.component').then(m => m.ClientTransactionListComponent)
  },
  {
    path: 'policy',
    loadComponent: () => import('../../modules/client/policy/policy.component').then(m => m.PolicyComponent)
  },
  {
    path: 'terms-of-service',
    loadComponent: () => import('../../modules/client/terms-of-service/terms-of-service.component').then(m => m.TermsOfServiceComponent)
  }
];
