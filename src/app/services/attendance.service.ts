// Ubicación: src/app/services/attendance.service.ts

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { GeolocationService } from './geolocation.service';
import { CameraService } from './camera.service';
import { Attendance } from '../models/attendance.model';
import { AuthService } from './auth.service';
import { BehaviorSubject, firstValueFrom, Observable, from } from 'rxjs';
import { Platform } from '@ionic/angular';
import { ValidLocation } from '../models/location.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private todayAttendances = new BehaviorSubject<{entrada?: Attendance, salida?: Attendance}>({});
  private allAttendances = new BehaviorSubject<Attendance[]>([]);
  private isInitialized = false;

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
      // Esperar a que la plataforma esté lista
      await this.platform.ready();

      // Escuchar cambios de usuario autenticado
      this.authService.currentUser.subscribe(async user => {
        if (user?.id) {
          console.log('Usuario autenticado, cargando asistencias:', user.id);
          await this.loadTodayAttendances();
          await this.loadAllAttendances();
        } else {
          // Limpiar datos cuando no hay usuario
          this.todayAttendances.next({});
          this.allAttendances.next([]);
        }
      });

      this.isInitialized = true;
      console.log('AttendanceService inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando AttendanceService:', error);
    }
  }

  // Cargar todas las asistencias del usuario
  private async loadAllAttendances() {
    const user = this.authService.currentUserValue;
    if (!user?.id) {
      console.log('No hay usuario autenticado para cargar asistencias');
      return;
    }

    try {
      console.log('Cargando todas las asistencias para usuario:', user.id);
      const attendances = await this.databaseService.getUserAttendances(user.id);
      console.log('Asistencias cargadas:', attendances.length);
      this.allAttendances.next(attendances);
    } catch (error) {
      console.error('Error loading all attendances:', error);
      this.allAttendances.next([]);
    }
  }

  // Cargar las asistencias del día actual
  async loadTodayAttendances() {
    const user = this.authService.currentUserValue;
    if (!user?.id) {
      console.log('No hay usuario autenticado para cargar asistencias de hoy');
      this.todayAttendances.next({});
      return;
    }

    try {
      console.log('Cargando asistencias de hoy para usuario:', user.id);
      const attendances = await this.databaseService.getUserAttendances(user.id);
      
      const today = new Date();
      const todayString = this.formatDateString(today);
      
      console.log('Buscando asistencias para fecha:', todayString);
      
      const todayEntrada = attendances.find(a => {
        const attendanceDate = new Date(a.fecha);
        const attendanceDateString = this.formatDateString(attendanceDate);
        const isEntrada = a.tipo === 'entrada';
        const isSameDate = attendanceDateString === todayString;
        
        console.log(`Comparando: ${attendanceDateString} === ${todayString}, tipo: ${a.tipo}, match: ${isSameDate && isEntrada}`);
        
        return isEntrada && isSameDate;
      });
      
      const todaySalida = attendances.find(a => {
        const attendanceDate = new Date(a.fecha);
        const attendanceDateString = this.formatDateString(attendanceDate);
        const isSalida = a.tipo === 'salida';
        const isSameDate = attendanceDateString === todayString;
        
        return isSalida && isSameDate;
      });
      
      const todayData = {
        entrada: todayEntrada,
        salida: todaySalida
      };
      
      console.log('Asistencias de hoy encontradas:', todayData);
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
    const canCheck = !today.entrada;
    console.log('¿Puede registrar entrada?', canCheck, 'Estado actual:', today);
    return canCheck;
  }

  // Verificar si puede registrar salida
  canCheckOut(): boolean {
    const today = this.todayAttendances.value;
    const canCheck = !!today.entrada && !today.salida;
    console.log('¿Puede registrar salida?', canCheck, 'Estado actual:', today);
    return canCheck;
  }

  // Registrar asistencia (entrada o salida)
  async registerAttendance(tipo: 'entrada' | 'salida'): Promise<Attendance> {
    console.log(`Iniciando registro de ${tipo}`);
    
    const user = this.authService.currentUserValue;
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    console.log('Usuario autenticado:', user.id);
    
    // Verificar si ya registró este tipo de asistencia hoy
    const alreadyRegistered = await this.databaseService.hasUserRegisteredToday(user.id, tipo);
    if (alreadyRegistered) {
      throw new Error(`Ya has registrado tu ${tipo} el día de hoy`);
    }
    
    // Verificar lógica de entrada/salida
    const todayData = this.todayAttendances.value;
    if (tipo === 'salida' && !todayData.entrada) {
      throw new Error('Debes registrar tu entrada antes de la salida');
    }
    
    try {
      // Obtener ubicación (con fallback para web)
      let position: any = null;
      let locationValidation: { isValid: boolean; distance: number; location: ValidLocation | null } = { 
        isValid: true, 
        distance: 0, 
        location: null 
      };
      
      try {
        console.log('Obteniendo ubicación...');
        position = await this.getLocationWithFallback();
        console.log('Ubicación obtenida:', position);
        
        if (position?.coords) {
          locationValidation = await this.geolocationService.isWithinValidLocation(
            position.coords.latitude,
            position.coords.longitude
          );
          console.log('Validación de ubicación:', locationValidation);
        }
      } catch (locationError) {
        console.warn('Error obteniendo ubicación, continuando con ubicación por defecto:', locationError);
        // Usar ubicación por defecto para entorno web
        position = {
          coords: {
            latitude: -34.603722, // Buenos Aires por defecto
            longitude: -58.381592
          }
        };
        locationValidation = { isValid: true, distance: 0, location: null };
      }
      
      // Tomar foto (con fallback para web)
      let photoUrl = '';
      try {
        console.log('Tomando foto...');
        photoUrl = await this.getCameraWithFallback();
        console.log('Foto tomada:', photoUrl ? 'Sí' : 'No');
      } catch (photoError) {
        console.warn('Error tomando foto, continuando sin foto:', photoError);
        // Continuar sin foto
        photoUrl = '';
      }
      
      // Crear registro de asistencia
      const now = new Date();
      const attendance: Attendance = {
        userId: user.id,
        tipo: tipo,
        fecha: now,
        hora: this.formatTime(now),
        ubicacion: {
          latitud: position?.coords?.latitude || -34.603722,
          longitud: position?.coords?.longitude || -58.381592
        },
        fotoUrl: photoUrl,
        ubicacionValida: locationValidation.isValid
      };
      
      console.log('Guardando asistencia:', attendance);
      
      // Guardar asistencia en la base de datos
      const savedAttendance = await this.databaseService.saveAttendance(attendance);
      console.log('Asistencia guardada exitosamente:', savedAttendance.id);
      
      // Actualizar las asistencias del día y todas las asistencias
      await this.loadTodayAttendances();
      await this.loadAllAttendances();
      
      return savedAttendance;
    } catch (error) {
      console.error('Error in registerAttendance:', error);
      throw error;
    }
  }

  // Obtener ubicación con fallback para entorno web
  private async getLocationWithFallback(): Promise<any> {
    try {
      // Intentar obtener ubicación real
      return await firstValueFrom(this.geolocationService.getCurrentPosition());
    } catch (error) {
      console.warn('Geolocation no disponible, usando ubicación por defecto');
      
      // Si no funciona, intentar con la API web de geolocalización
      if (navigator.geolocation) {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                coords: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                }
              });
            },
            (error) => {
              console.warn('Web geolocation también falló:', error);
              // Usar ubicación por defecto
              resolve({
                coords: {
                  latitude: -34.603722, // Buenos Aires
                  longitude: -58.381592
                }
              });
            },
            {
              timeout: 10000,
              enableHighAccuracy: false
            }
          );
        });
      } else {
        // Navegador no soporta geolocalización
        return {
          coords: {
            latitude: -34.603722,
            longitude: -58.381592
          }
        };
      }
    }
  }

  // Obtener foto con fallback para entorno web
  private async getCameraWithFallback(): Promise<string> {
    try {
      // Intentar usar la cámara de Capacitor
      return await this.cameraService.takePicture();
    } catch (error) {
      console.warn('Cámara de Capacitor no disponible, intentando con Web API');
      
      // Si no funciona, intentar con la API web de medios
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          
          // Crear un canvas para capturar la imagen
          const video = document.createElement('video');
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          return new Promise((resolve) => {
            video.srcObject = stream;
            video.play();
            
            video.onloadedmetadata = () => {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx?.drawImage(video, 0, 0);
              
              // Detener el stream
              stream.getTracks().forEach(track => track.stop());
              
              // Convertir a base64
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              resolve(dataUrl);
            };
          });
        } catch (webCameraError) {
          console.warn('Web camera también falló:', webCameraError);
          return '';
        }
      } else {
        console.warn('No hay soporte para cámara en este navegador');
        return '';
      }
    }
  }

  // Formatear hora consistentemente
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Obtener historial de asistencias del usuario actual
  async getUserAttendanceHistory(): Promise<Attendance[]> {
    const user = this.authService.currentUserValue;
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const attendances = await this.databaseService.getUserAttendances(user.id);
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

  // Método de compatibilidad para home.page.ts
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

  // Método de compatibilidad para history.page.ts
  async getAttendanceHistory(userId: string, startDate: Date, endDate: Date): Promise<Attendance[]> {
    const allAttendances = await this.getUserAttendanceHistory();
    
    // Filtrar por rango de fechas
    return allAttendances.filter(attendance => {
      const attendanceDate = new Date(attendance.fecha);
      return attendanceDate >= startDate && attendanceDate <= endDate;
    });
  }

  // Solicitar permisos necesarios
  async requestPermissions(): Promise<void> {
    try {
      console.log('Solicitando permisos...');
      
      // Intentar solicitar permisos de Capacitor
      try {
        await this.geolocationService.requestPermissions();
        await this.cameraService.requestPermissions();
        console.log('Permisos de Capacitor obtenidos');
      } catch (capacitorError) {
        console.warn('Permisos de Capacitor no disponibles:', capacitorError);
        
        // Para entorno web, los permisos se solicitan automáticamente cuando se usan
        console.log('Ejecutándose en entorno web, permisos se solicitarán cuando sea necesario');
      }
    } catch (error) {
      console.warn('Error requesting permissions:', error);
      // No lanzar error, permitir que la app funcione sin todos los permisos
    }
  }

  // Método para forzar actualización de datos
  async forceRefresh(): Promise<void> {
    console.log('Forzando actualización de datos...');
    await this.loadTodayAttendances();
    await this.loadAllAttendances();
  }

  // Método para debug
  getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      todayAttendances: this.todayAttendances.value,
      allAttendancesCount: this.allAttendances.value.length,
      currentUser: this.authService.currentUserValue?.id || 'No user'
    };
  }
}