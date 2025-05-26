import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { GeolocationService } from './geolocation.service';
import { CameraService } from './camera.service';
import { Attendance } from '../models/attendance.model';
import { AuthService } from './auth.service';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private todayAttendances = new BehaviorSubject<{entrada?: Attendance, salida?: Attendance}>({});

  constructor(
    private databaseService: DatabaseService,
    private geolocationService: GeolocationService,
    private cameraService: CameraService,
    private authService: AuthService
  ) {
    this.loadTodayAttendances();
  }

  // Cargar las asistencias del día
  async loadTodayAttendances() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!user.id) {
      throw new Error('El ID del usuario no está definido');
    }
    
    try {
      const attendances = await this.databaseService.getUserAttendances(user.id);
      const todayEntrada = attendances.find(a => {
        const attendanceDate = new Date(a.fecha);
        attendanceDate.setHours(0, 0, 0, 0);
        return a.tipo === 'entrada' && attendanceDate.getTime() === today.getTime();
      });
      
      const todaySalida = attendances.find(a => {
        const attendanceDate = new Date(a.fecha);
        attendanceDate.setHours(0, 0, 0, 0);
        return a.tipo === 'salida' && attendanceDate.getTime() === today.getTime();
      });
      
      this.todayAttendances.next({
        entrada: todayEntrada,
        salida: todaySalida
      });
    } catch (error) {
      console.error('Error loading today attendances:', error);
    }
  }

  // Obtener las asistencias del día actual
  getTodayAttendances(): Observable<{entrada?: Attendance, salida?: Attendance}> {
    return this.todayAttendances.asObservable();
  }

  // Registrar asistencia (entrada o salida)
  async registerAttendance(tipo: 'entrada' | 'salida'): Promise<Attendance> {
    const user = this.authService.currentUserValue;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }
    
    // Verificar si ya registró este tipo de asistencia hoy
    if (!user.id) {
      throw new Error('El ID del usuario no está definido');
    }
    
    const alreadyRegistered = await this.databaseService.hasUserRegisteredToday(user.id, tipo);
    if (alreadyRegistered) {
      throw new Error(`Ya has registrado tu ${tipo} por hoy`);
    }
    
    // Obtener la ubicación actual
    const position = await firstValueFrom(this.geolocationService.getCurrentPosition());
    if (!position || !position.coords) {
      throw new Error('No se pudo obtener la posición actual');
    }
    
    // Verificar si está dentro de una ubicación válida
    const locationValidation = await this.geolocationService.isWithinValidLocation(
      position.coords.latitude,
      position.coords.longitude
    );
    
    // Tomar foto
    const photoUrl = await this.cameraService.takePicture();
    
    // Crear registro de asistencia
    const now = new Date();
    const attendance: Attendance = {
      userId: user.id,
      tipo: tipo,
      fecha: now,
      hora: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
      ubicacion: {
        latitud: position.coords.latitude,
        longitud: position.coords.longitude
      },
      fotoUrl: photoUrl,
      ubicacionValida: locationValidation.isValid
    };
    
    // Guardar asistencia
    const savedAttendance = await this.databaseService.saveAttendance(attendance);
    
    // Actualizar las asistencias del día
    await this.loadTodayAttendances();
    
    return savedAttendance;
  }

  // Método adicional para compatibilidad con home.page.ts
  async markAttendance(data: {
    userId: string;
    type: 'check-in' | 'check-out';
    location: any;
    photo: string;
    timestamp: Date;
  }): Promise<Attendance> {
    // Convertir el tipo de 'check-in'/'check-out' a 'entrada'/'salida'
    const tipo = data.type === 'check-in' ? 'entrada' : 'salida';
    return this.registerAttendance(tipo);
  }

  // Obtener historial de asistencias del usuario actual
  async getUserAttendanceHistory(): Promise<Attendance[]> {
    const user = this.authService.currentUserValue;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }
    
    if (!user.id) {
      throw new Error('El ID del usuario no está definido');
    }
    return await this.databaseService.getUserAttendances(user.id);
  }

  // Método adicional para compatibilidad con history.page.ts
  async getAttendanceHistory(userId: string, startDate: Date, endDate: Date): Promise<Attendance[]> {
    const allAttendances = await this.databaseService.getUserAttendances(userId);
    
    // Filtrar por rango de fechas
    return allAttendances.filter(attendance => {
      const attendanceDate = new Date(attendance.fecha);
      return attendanceDate >= startDate && attendanceDate <= endDate;
    });
  }
}