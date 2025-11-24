import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { ClientLayoutComponent } from './layouts/client-layout/client-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { adminRoutes } from './layouts/admin-layout/admin.routes';
import { clientRoutes } from './layouts/client-layout/client.routes';

export const routes: Routes = [
  {
    path: '',
    component: ClientLayoutComponent,
    children: clientRoutes
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
    children: adminRoutes
  },
  {
    path: '**',
    redirectTo: ''
  }
];
