import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { User } from '../models/user.model';
import { Attendance } from '../models/attendance.model';
import { ValidLocation } from '../models/location.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private _storage: Storage | null = null;
  private _locations = new BehaviorSubject<ValidLocation[]>([]);
  
  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
    await this.loadLocations();
    await this.seedDefaultLocation();
  }

  // Método para precargar una ubicación de trabajo predeterminada
  private async seedDefaultLocation() {
    const locations = await this.getLocations();
    if (locations.length === 0) {
      const defaultLocation: ValidLocation = {
        id: '1',
        nombre: 'Oficina Principal',
        latitud: -34.603722, // Ejemplo: Buenos Aires
        longitud: -58.381592,
        radioPermitido: 100 // 100 metros
      };
      await this.addLocation(defaultLocation);
    }
  }

  // Obtiene todas las ubicaciones válidas
  async loadLocations() {
    const locations = await this._storage?.get('locations') || [];
    this._locations.next(locations);
    return locations;
  }

  // Devuelve un Observable de las ubicaciones
  getLocationsAsObservable(): Observable<ValidLocation[]> {
    return this._locations.asObservable();
  }

  // Obtiene todas las ubicaciones válidas
  async getLocations(): Promise<ValidLocation[]> {
    return await this._storage?.get('locations') || [];
  }

  // Agrega una nueva ubicación válida
  async addLocation(location: ValidLocation): Promise<void> {
    const locations = await this.getLocations();
    if (!location.id) {
      location.id = Date.now().toString();
    }
    locations.push(location);
    await this._storage?.set('locations', locations);
    this._locations.next(locations);
  }

  // Registra un nuevo usuario
  async registerUser(user: User): Promise<User> {
    const users = await this.getUsers();
    
    // Verificar si el email ya existe
    const existingUser = users.find(u => u.email === user.email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }
    
    // Generar ID y fecha de creación
    user.id = Date.now().toString();
    user.fechaCreacion = new Date();
    
    users.push(user);
    await this._storage?.set('users', users);
    
    // Devolvemos el usuario sin la contraseña para mayor seguridad
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  // Obtiene todos los usuarios
  async getUsers(): Promise<User[]> {
    return await this._storage?.get('users') || [];
  }

  // Autentica un usuario
  async loginUser(email: string, password: string): Promise<User> {
    const users = await this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Email o contraseña incorrectos');
    }
    
    // Devolvemos el usuario sin la contraseña para mayor seguridad
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  // Registra una nueva asistencia
  async saveAttendance(attendance: Attendance): Promise<Attendance> {
    const attendances = await this.getAttendances();
    
    // Generar ID
    attendance.id = Date.now().toString();
    
    attendances.push(attendance);
    await this._storage?.set('attendances', attendances);
    
    return attendance;
  }

  // Obtiene todas las asistencias
  async getAttendances(): Promise<Attendance[]> {
    return await this._storage?.get('attendances') || [];
  }

  // Obtiene todas las asistencias de un usuario
  async getUserAttendances(userId: string): Promise<Attendance[]> {
    const attendances = await this.getAttendances();
    return attendances.filter(a => a.userId === userId);
  }

  // Verifica si el usuario ya registró entrada/salida hoy
  async hasUserRegisteredToday(userId: string, tipo: 'entrada' | 'salida'): Promise<boolean> {
    const attendances = await this.getUserAttendances(userId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return attendances.some(a => {
      const attendanceDate = new Date(a.fecha);
      attendanceDate.setHours(0, 0, 0, 0);
      return a.tipo === tipo && 
             attendanceDate.getTime() === today.getTime();
    });
  }
}