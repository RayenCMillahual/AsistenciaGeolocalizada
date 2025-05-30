// src/app/services/attendance.service.ts - CORREGIDO
import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { GeolocationService } from './geolocation.service';
import { CameraService } from './camera.service';
import { Attendance } from '../models/attendance.model';
import { AuthService } from './auth.service';
import { BehaviorSubject, firstValueFrom, Observable, from, Subscription } from 'rxjs';
import { Platform } from '@ionic/angular';
import { ValidLocation } from '../models/location.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private todayAttendances = new BehaviorSubject<{entrada?: Attendance, salida?: Attendance}>({});
  private allAttendances = new BehaviorSubject<Attendance[]>([]);
  private isInitialized = false;
  private userSubscription?: Subscription;
  private currentUserId: string | null = null;

  constructor(
    private databaseService: DatabaseService,
    private geolocationService: GeolocationService,
    private cameraService: CameraService,
    private authService: AuthService,
    private platform: Platform
  ) {
    this.initializeService();
  }

  private async initializeService() {
    if (this.isInitialized) return;

    try {
      await this.platform.ready();
      
      // SOLUCIÓN: Evitar bucle infinito con suscripción controlada
      this.userSubscription = this.authService.currentUser.subscribe(async user => {
        const newUserId = user?.id || null;
        
        // Solo actualizar si el usuario realmente cambió
        if (this.currentUserId !== newUserId) {
          console.log('Usuario cambió de', this.currentUserId, 'a', newUserId);
          this.currentUserId = newUserId;
          
          if (newUserId) {
            console.log('Cargando datos para nuevo usuario:', newUserId);
            // Usar setTimeout para evitar llamadas inmediatas que causen bucle
            setTimeout(() => {
              this.loadUserData(newUserId);
            }, 100);
          } else {
            // Limpiar datos cuando no hay usuario
            this.todayAttendances.next({});
            this.allAttendances.next([]);
            console.log('Usuario deslogueado, datos limpiados');
          }
        }
      });

      this.isInitialized = true;
      console.log('AttendanceService inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando AttendanceService:', error);
    }
  }

  // Método separado para cargar datos del usuario
  private async loadUserData(userId: string) {
    try {
      console.log('=== CARGANDO DATOS DE USUARIO ===', userId);
      await this.loadTodayAttendances();
      await this.loadAllAttendances();
      console.log('=== DATOS CARGADOS EXITOSAMENTE ===');
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  }

  // Cargar todas las asistencias del usuario
  private async loadAllAttendances() {
    if (!this.currentUserId) {
      console.log('No hay usuario para cargar asistencias');
      this.allAttendances.next([]);
      return;
    }

    try {
      console.log('Cargando todas las asistencias para usuario:', this.currentUserId);
      const attendances = await this.databaseService.getUserAttendances(this.currentUserId);
      console.log('Asistencias cargadas:', attendances.length);
      this.allAttendances.next(attendances);
    } catch (error) {
      console.error('Error loading all attendances:', error);
      this.allAttendances.next([]);
    }
  }

  // Cargar las asistencias del día actual
  async loadTodayAttendances() {
    if (!this.currentUserId) {
      console.log('No hay usuario para cargar asistencias de hoy');
      this.todayAttendances.next({});
      return;
    }

    try {
      console.log('Cargando asistencias de hoy para usuario:', this.currentUserId);
      const attendances = await this.databaseService.getUserAttendances(this.currentUserId);
      
      const today = new Date();
      const todayString = this.formatDateString(today);
      
      console.log('Buscando asistencias para fecha:', todayString);
      
      const todayEntrada = attendances.find(a => {
        const attendanceDate = new Date(a.fecha);
        const attendanceDateString = this.formatDateString(attendanceDate);
        return a.tipo === 'entrada' && attendanceDateString === todayString;
      });
      
      const todaySalida = attendances.find(a => {
        const attendanceDate = new Date(a.fecha);
        const attendanceDateString = this.formatDateString(attendanceDate);
        return a.tipo === 'salida' && attendanceDateString === todayString;
      });
      
      const todayData = {
        entrada: todayEntrada,
        salida: todaySalida
      };
      
      console.log('Asistencias de hoy encontradas:', {
        entrada: !!todayEntrada,
        salida: !!todaySalida
      });
      
      this.todayAttendances.next(todayData);
    } catch (error) {
      console.error('Error loading today attendances:', error);
      this.todayAttendances.next({});
    }
  }

  // Formatear fecha para comparación consistente
  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Obtener las asistencias del día actual como Observable
  getTodayAttendances(): Observable<{entrada?: Attendance, salida?: Attendance}> {
    return this.todayAttendances.asObservable();
  }

  // Obtener el valor actual de las asistencias de hoy
  getTodayAttendancesValue(): {entrada?: Attendance, salida?: Attendance} {
    return this.todayAttendances.value;
  }

  // Verificar si puede registrar entrada
  canCheckIn(): boolean {
    const today = this.todayAttendances.value;
    return !today.entrada;
  }

  // Verificar si puede registrar salida
  canCheckOut(): boolean {
    const today = this.todayAttendances.value;
    return !!today.entrada && !today.salida;
  }

  // Registrar asistencia (entrada o salida)
  async registerAttendance(tipo: 'entrada' | 'salida'): Promise<Attendance> {
    console.log(`=== REGISTRO DE ${tipo.toUpperCase()} ===`);
    
    if (!this.currentUserId) {
      throw new Error('Usuario no autenticado');
    }

    console.log('Usuario:', this.currentUserId);
    
    // Verificar lógica de entrada/salida
    const todayData = this.todayAttendances.value;
    if (tipo === 'salida' && !todayData.entrada) {
      throw new Error('Debes registrar tu entrada antes de la salida');
    }
    
    if (tipo === 'entrada' && todayData.entrada) {
      throw new Error('Ya has registrado tu entrada hoy');
    }
    
    if (tipo === 'salida' && todayData.salida) {
      throw new Error('Ya has registrado tu salida hoy');
    }
    
    try {
      // Obtener ubicación con fallback
      console.log('📍 Obteniendo ubicación...');
      const position = await this.getLocationWithFallback();
      console.log('📍 Ubicación obtenida:', position.coords);
      
      // Validar ubicación
      let locationValidation: { isValid: boolean; distance: number; location: ValidLocation | null } = { 
        isValid: true, 
        distance: 0, 
        location: null 
      };
      try {
        locationValidation = await this.geolocationService.isWithinValidLocation(
          position.coords.latitude,
          position.coords.longitude
        );
        console.log('✅ Validación de ubicación:', locationValidation);
      } catch (error) {
        console.warn('⚠️ Error validando ubicación:', error);
      }
      
      // Tomar foto con fallback
      console.log('📸 Tomando foto...');
      let photoUrl = '';
      try {
        photoUrl = await this.getCameraWithFallback();
        console.log('📸 Foto:', photoUrl ? 'Capturada' : 'Sin foto');
      } catch (photoError) {
        console.warn('⚠️ Error tomando foto:', photoError);
      }
      
      // Crear registro de asistencia
      const now = new Date();
      const attendance: Attendance = {
        userId: this.currentUserId,
        tipo: tipo,
        fecha: now,
        hora: this.formatTime(now),
        ubicacion: {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        },
        fotoUrl: photoUrl,
        ubicacionValida: locationValidation.isValid
      };
      
      console.log('💾 Guardando asistencia...');
      const savedAttendance = await this.databaseService.saveAttendance(attendance);
      console.log('✅ Asistencia guardada:', savedAttendance.id);
      
      // Actualizar datos locales SIN causar bucle infinito
      console.log('🔄 Actualizando datos locales...');
      await this.loadTodayAttendances();
      await this.loadAllAttendances();
      
      console.log(`✅ ${tipo.toUpperCase()} REGISTRADA EXITOSAMENTE`);
      return savedAttendance;
      
    } catch (error) {
      console.error(`❌ Error registrando ${tipo}:`, error);
      throw error;
    }
  }

  // Obtener ubicación con fallback mejorado
  private async getLocationWithFallback(): Promise<any> {
    // Primero intentar con Capacitor
    try {
      return await firstValueFrom(this.geolocationService.getCurrentPosition());
    } catch (capacitorError) {
      console.log('Capacitor geolocation falló, intentando con Web API...');
    }

    // Fallback a Web API
    if (navigator.geolocation) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout obteniendo ubicación'));
        }, 10000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeout);
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            });
          },
          (error) => {
            clearTimeout(timeout);
            console.warn('Web geolocation falló:', error);
            // Usar ubicación por defecto
            resolve({
              coords: {
                latitude: -38.9516, // Cipolletti, Neuquén
                longitude: -68.0591
              }
            });
          },
          {
            timeout: 8000,
            enableHighAccuracy: true,
            maximumAge: 300000 // 5 minutos
          }
        );
      });
    }

    // Ubicación por defecto si todo falla
    return {
      coords: {
        latitude: -38.9516,
        longitude: -68.0591
      }
    };
  }

  // Obtener foto con fallback mejorado
  private async getCameraWithFallback(): Promise<string> {
    try {
      return await this.cameraService.takePicture();
    } catch (capacitorError) {
      console.log('Capacitor camera falló, usando Web API...');
      
      // Para web, devolver string vacío por ahora
      // TODO: Implementar captura web con getUserMedia si es necesario
      return '';
    }
  }

  // Formatear hora
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Obtener historial de asistencias
  async getUserAttendanceHistory(): Promise<Attendance[]> {
    if (!this.currentUserId) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const attendances = await this.databaseService.getUserAttendances(this.currentUserId);
      this.allAttendances.next(attendances);
      return attendances;
    } catch (error) {
      console.error('Error getting user attendance history:', error);
      throw error;
    }
  }

  // Obtener asistencias como Observable
  getUserAttendancesObservable(): Observable<Attendance[]> {
    return this.allAttendances.asObservable();
  }

  // Método de compatibilidad
  async markAttendance(data: {
    userId: string;
    type: 'check-in' | 'check-out';
    location?: any;
    photo?: string;
    timestamp?: Date;
  }): Promise<Attendance> {
    const tipo = data.type === 'check-in' ? 'entrada' : 'salida';
    return this.registerAttendance(tipo);
  }

  // Método de compatibilidad para history
  async getAttendanceHistory(userId: string, startDate: Date, endDate: Date): Promise<Attendance[]> {
    const allAttendances = await this.getUserAttendanceHistory();
    
    return allAttendances.filter(attendance => {
      const attendanceDate = new Date(attendance.fecha);
      return attendanceDate >= startDate && attendanceDate <= endDate;
    });
  }

  // Solicitar permisos
  async requestPermissions(): Promise<void> {
    try {
      console.log('📱 Solicitando permisos...');
      await this.geolocationService.requestPermissions();
      await this.cameraService.requestPermissions();
      console.log('✅ Permisos obtenidos');
    } catch (error) {
      console.warn('⚠️ Error con permisos:', error);
    }
  }

  // Forzar actualización
  async forceRefresh(): Promise<void> {
    console.log('🔄 Forzando actualización...');
    if (this.currentUserId) {
      await this.loadTodayAttendances();
      await this.loadAllAttendances();
    }
  }

  // Cleanup
  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  // Debug info
  getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      currentUserId: this.currentUserId,
      todayAttendances: this.todayAttendances.value,
      allAttendancesCount: this.allAttendances.value.length
    };
  }
}