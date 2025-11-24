import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('../../modules/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'users-management',
    children: [
      {
        path: '',
        loadComponent: () => import('../../modules/admin/users-management/list/list.component').then(m => m.UsersListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('../../modules/admin/users-management/create/create.component').then(m => m.UsersCreateComponent)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('../../modules/admin/users-management/update/update.component').then(m => m.UsersUpdateComponent)
      }
    ]
  },
  {
    path: 'mail-management',
    children: [
      {
        path: '',
        loadComponent: () => import('../../modules/admin/mail-management/product/list/list.component').then(m => m.MailManagementListComponent)
      },
      {
        path: ':id/items',
        loadComponent: () => import('../../modules/admin/mail-management/product-items/product-item-list/product-item-list.component').then(m => m.ProductItemListComponent)
      }
    ]
  },
  {
    path: 'categories-management',
    loadComponent: () => import('../../modules/admin/category-management/list/list.component').then(m => m.CategoryListComponent)
  },
  {
    path: 'orders-management',
    loadComponent: () => import('../../modules/admin/order-management/list/list.component').then(m => m.OrderListComponent)
  },
  {
    path: 'transactions-management',
    loadComponent: () => import('../../modules/admin/transaction-management/list/list.component').then(m => m.TransactionListComponent)
  }
];
