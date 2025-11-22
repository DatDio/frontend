import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { ClientLayoutComponent } from './layouts/client-layout/client-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: ClientLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./modules/client/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'mail-accounts',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/client/mail-accounts/list/list.component').then(m => m.MailAccountListComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./modules/client/mail-accounts/detail/detail.component').then(m => m.MailAccountDetailComponent)
          }
        ]
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/client/orders/list/list.component').then(m => m.ClientOrderListComponent)
      },
      {
        path: 'transactions',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/client/transactions/list/list.component').then(m => m.ClientTransactionListComponent)
      }
    ]
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./modules/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./modules/auth/register/register.component').then(m => m.RegisterComponent)
      }
    ]
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users-management',
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/admin/users-management/list/list.component').then(m => m.UsersListComponent)
          },
          {
            path: 'create',
            loadComponent: () => import('./modules/admin/users-management/create/create.component').then(m => m.UsersCreateComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./modules/admin/users-management/detail/detail.component').then(m => m.UsersDetailComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./modules/admin/users-management/update/update.component').then(m => m.UsersUpdateComponent)
          }
        ]
      },
      {
        path: 'mail-management',
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/admin/mail-management/list/list.component').then(m => m.MailManagementListComponent)
          },
          {
            path: ':id/items',
            loadComponent: () => import('./modules/admin/mail-management/product-item-list/product-item-list.component').then(m => m.ProductItemListComponent)
          }
        ]
      },
      {
        path: 'categories',
        loadComponent: () => import('./modules/admin/category-management/list/list.component').then(m => m.CategoryListComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./modules/admin/order-management/list/list.component').then(m => m.OrderListComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./modules/admin/transaction-management/list/list.component').then(m => m.TransactionListComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
