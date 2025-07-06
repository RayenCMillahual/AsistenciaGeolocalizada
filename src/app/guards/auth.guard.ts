// src/app/guards/auth.guard.ts - VERSIÓN CORREGIDA
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take, switchMap, of, timer, from } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    console.log('🔒 AuthGuard: Verificando acceso...');
    
    // SOLUCIÓN: Usar from() para convertir Promise a Observable
    return from(this.authService.waitForInitialization()).pipe(
      switchMap(() => {
        return this.authService.currentUser.pipe(
          take(1), // Solo tomar el primer valor
          switchMap(user => {
            console.log('🔒 AuthGuard: Usuario después de inicialización:', user?.email || 'No user');
            
            if (user) {
              console.log('✅ AuthGuard: Acceso permitido');
              return of(true);
            } else {
              // Dar una segunda oportunidad esperando un poco más
              console.log('⏳ AuthGuard: Usuario no encontrado, esperando...');
              return timer(1000).pipe(
                switchMap(() => this.authService.currentUser.pipe(take(1))),
                map(delayedUser => {
                  if (delayedUser) {
                    console.log('✅ AuthGuard: Usuario encontrado después de espera:', delayedUser.email);
                    return true;
                  } else {
                    console.log('❌ AuthGuard: Sin usuario, redirigiendo a login');
                    this.router.navigate(['/login'], { replaceUrl: true });
                    return false;
                  }
                })
              );
            }
          })
        );
      })
    );
  }
}