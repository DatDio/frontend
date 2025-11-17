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
        path: 'pricing',
        loadComponent: () => import('./modules/client/pricing/pricing.component').then(m => m.PricingComponent)
      },
      {
        path: 'blog',
        loadComponent: () => import('./modules/client/blog/blog.component').then(m => m.BlogComponent)
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
        loadComponent: () => import('./modules/admin/users-management/list/list.component').then(m => m.UsersListComponent)
      },
      {
        path: 'mail-management',
        loadComponent: () => import('./modules/admin/mail-management/mail-management.component').then(m => m.MailManagementComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
