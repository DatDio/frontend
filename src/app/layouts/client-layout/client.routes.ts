import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const clientRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../modules/client/home/home.component').then(m => m.HomeComponent)
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
  }
];
