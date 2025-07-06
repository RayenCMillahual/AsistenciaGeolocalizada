// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { NoAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login', // Cambiado: Redirigir a login por defecto
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [NoAuthGuard] // Agregar guard para usuarios ya logueados
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
    canActivate: [NoAuthGuard] // Agregar guard para usuarios ya logueados
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
    canActivate: [AuthGuard] // CRÍTICO: Asegurar que está protegida
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history.page').then(m => m.HistoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/login' // Cualquier ruta no encontrada va a login
  }
];