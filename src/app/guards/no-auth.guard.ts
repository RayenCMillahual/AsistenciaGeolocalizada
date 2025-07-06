// src/app/guards/no-auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    console.log('🚫 NoAuthGuard: Verificando si usuario ya está logueado...');
    
    return this.authService.currentUser.pipe(
      tap(user => {
        console.log('🚫 NoAuthGuard: Usuario actual:', user?.email || 'No user');
      }),
      map(user => {
        if (user) {
          console.log('🚫 NoAuthGuard: Usuario logueado, redirigiendo a home');
          this.router.navigate(['/home'], { replaceUrl: true });
          return false;
        } else {
          console.log('✅ NoAuthGuard: Usuario no logueado, permitir acceso');
          return true;
        }
      })
    );
  }
}