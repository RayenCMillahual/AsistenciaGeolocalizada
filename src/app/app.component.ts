// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';

import { AuthService } from './services/auth.service';
import { AttendanceService } from './services/attendance.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet]
})
export class AppComponent implements OnInit, OnDestroy {
  private reconnectInterval?: number;

  constructor(
    private platform: Platform,
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.initializeApp();
  }

  ngOnDestroy() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
  }

  private async initializeApp() {
    try {
      console.log('Inicializando aplicación...');
      
      // Esperar a que la plataforma esté lista
      await this.platform.ready();
      console.log('Plataforma lista:', this.platform.platforms());
      
      // Configurar monitoreo básico de red
      this.setupBasicNetworkMonitoring();
      
      // Configurar permisos
      await this.setupPermissions();
      
      // Configurar navegación inicial
      this.setupInitialNavigation();
      
      // Configurar reconexión automática
      this.setupAutoReconnect();
      
      console.log('Aplicación inicializada correctamente');
      
    } catch (error) {
      console.error('Error inicializando aplicación:', error);
      // No bloquear la app por errores de inicialización
    }
  }

  private setupBasicNetworkMonitoring() {
    // Monitoreo básico de red usando APIs web estándar
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Conexión restaurada');
        this.handleNetworkReconnect();
      });

      window.addEventListener('offline', () => {
        console.log('Conexión perdida');
        this.handleNetworkDisconnect();
      });

      // Verificar estado inicial
      console.log('Estado de red inicial:', navigator.onLine ? 'online' : 'offline');
    }
  }

  private handleNetworkReconnect() {
    console.log('Reconectando servicios...');
    
    // Intentar reautenticar y sincronizar datos
    setTimeout(async () => {
      try {
        if (this.authService.isAuthenticated()) {
          await this.authService.refreshUserData();
          await this.attendanceService.forceRefresh();
          console.log('Servicios reconectados exitosamente');
        }
      } catch (error) {
        console.error('Error reconectando servicios:', error);
      }
    }, 1000); // Esperar 1 segundo antes de reconectar
  }

  private handleNetworkDisconnect() {
    console.log('Modo offline activado');
    // Aquí podrías mostrar un toast o mensaje indicando modo offline
  }

  private async setupPermissions() {
    try {
      console.log('Solicitando permisos...');
      
      // Solicitar permisos de manera no bloqueante
      await this.attendanceService.requestPermissions();
      
      console.log('Permisos configurados');
    } catch (error) {
      console.warn('Algunos permisos no se pudieron obtener:', error);
      // No bloquear la app por permisos denegados
    }
  }

  private setupInitialNavigation() {
    // Configurar navegación inicial con delay para permitir que Firebase se inicialice
    setTimeout(() => {
      this.checkAuthAndNavigate();
    }, 1500); // Aumentado a 1.5 segundos para dar más tiempo a Firebase
  }

  private checkAuthAndNavigate() {
    const isAuthenticated = this.authService.isAuthenticated();
    const currentRoute = this.router.url;
    
    console.log('Verificando navegación - Autenticado:', isAuthenticated, 'Ruta actual:', currentRoute);
    
    // Solo redirigir si estamos en la raíz o rutas de auth
    if (currentRoute === '/' || currentRoute === '' || currentRoute === '/login') {
      if (isAuthenticated) {
        console.log('Usuario autenticado, redirigiendo a home');
        this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        console.log('Usuario no autenticado, redirigiendo a login');
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }
  }

  private setupAutoReconnect() {
    // Configurar reconexión automática cada 30 segundos si hay problemas
    this.reconnectInterval = window.setInterval(() => {
      if (navigator.onLine && this.authService.isAuthenticated()) {
        // Verificar si la sesión sigue activa
        this.authService.refreshUserData().catch((error: any) => {
          if (error.code === 'auth/network-request-failed') {
            console.log('Problema de red detectado, reintentando...');
          }
        });
      }
    }, 30000); // 30 segundos
  }

  // Método para debug
  getDebugInfo() {
    return {
      platform: this.platform.platforms(),
      isOnline: navigator.onLine,
      isAuthenticated: this.authService.isAuthenticated(),
      currentUser: this.authService.currentUserValue?.email || 'No user',
      currentRoute: this.router.url
    };
  }
}