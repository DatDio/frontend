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
  },
  {
    path: 'get-code-mail',
    loadComponent: () => import('../../modules/client/get-code-mail/get-code-mail.component').then(m => m.GetCodeMailComponent)
  },
  {
    path: 'support',
    loadComponent: () => import('../../modules/client/support/support.component').then(m => m.SupportComponent)
  },
  {
    path: 'ranks',
    loadComponent: () => import('../../modules/client/ranks/ranks.component').then(m => m.RanksComponent)
  },
  {
    path: 'tools',
    loadComponent: () => import('../../modules/client/tools/tools.component').then(m => m.ToolsComponent)
  },
  {
    path: 'check-live-facebook',
    loadComponent: () => import('../../modules/client/check-live-facebook/check-live-facebook.component').then(m => m.CheckLiveFacebookComponent)
  },
  {
    path: 'check-live-mail',
    loadComponent: () => import('../../modules/client/check-live-mail/check-live-mail.component').then(m => m.CheckLiveMailComponent)
  },
  {
    path: 'get-2fa',
    loadComponent: () => import('../../modules/client/get-2fa/get-2fa.component').then(m => m.Get2FAComponent)
  },
  {
    path: 'get-oauth2',
    loadComponent: () => import('../../modules/client/get-oauth2/get-oauth2.component').then(m => m.GetOAuth2Component)
  },
  {
    path: 'read-mail',
    loadComponent: () => import('../../modules/client/read-mail/read-mail.component').then(m => m.ReadMailComponent)
  }
];
