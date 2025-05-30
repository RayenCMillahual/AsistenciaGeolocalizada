// src/app/app.component.ts
import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { AttendanceService } from './services/attendance.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet]
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private authService: AuthService,
    private attendanceService: AttendanceService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();
    console.log('Plataforma lista');
    
    // Solicitar permisos al inicializar
    try {
      await this.attendanceService.requestPermissions();
    } catch (error) {
      console.warn('No se pudieron obtener todos los permisos:', error);
    }
  }
}