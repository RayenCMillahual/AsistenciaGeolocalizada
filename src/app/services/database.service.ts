// Ubicación: src/app/services/database.service.ts

import { Injectable, inject } from '@angular/core';
import { 
  Firestore,
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  setDoc,
  getDoc,
  Timestamp,
  limit
} from '@angular/fire/firestore';
import { 
  Auth,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged
} from '@angular/fire/auth';
import { User } from '../models/user.model';
import { Attendance } from '../models/attendance.model';
import { ValidLocation } from '../models/location.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  
  private _locations = new BehaviorSubject<ValidLocation[]>([]);
  private currentUser: FirebaseUser | null = null;
  
  constructor() {
    this.init();
  }

  async init() {
    console.log('Inicializando DatabaseService...');
    await this.loadLocations();
    await this.seedDefaultLocation();
    
    // Escuchar cambios de autenticación
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      console.log('Estado de auth cambió:', user?.uid || 'No user');
    });
  }

  // =====================
  // GESTIÓN DE UBICACIONES
  // =====================
  
  private async seedDefaultLocation() {
    const locations = await this.getLocations();
    if (locations.length === 0) {
      console.log('Creando ubicación por defecto...');
      const defaultLocation: ValidLocation = {
        id: '1',
        nombre: 'Instituto Superior - Campus Principal',
        latitud: -34.603722,
        longitud: -58.381592,
        radioPermitido: 500 // 500 metros de radio
      };
      await this.addLocation(defaultLocation);
    }
  }

  async loadLocations() {
    try {
      const locationsRef = collection(this.firestore, 'locations');
      const snapshot = await getDocs(locationsRef);
      const locations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ValidLocation));
      
      this._locations.next(locations);
      console.log('Ubicaciones cargadas:', locations.length);
      return locations;
    } catch (error) {
      console.error('Error loading locations:', error);
      return [];
    }
  }

  getLocationsAsObservable(): Observable<ValidLocation[]> {
    return this._locations.asObservable();
  }

  async getLocations(): Promise<ValidLocation[]> {
    return this.loadLocations();
  }

  async addLocation(location: ValidLocation): Promise<void> {
    try {
      const locationsRef = collection(this.firestore, 'locations');
      
      if (location.id) {
        await setDoc(doc(this.firestore, 'locations', location.id), location);
      } else {
        await addDoc(locationsRef, location);
      }
      
      await this.loadLocations();
      console.log('Ubicación agregada exitosamente');
    } catch (error) {
      console.error('Error adding location:', error);
      throw error;
    }
  }

  // =====================
  // GESTIÓN DE USUARIOS
  // =====================

  async registerUser(userData: User): Promise<User> {
    try {
      console.log('Registrando usuario:', userData.email);
      
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        userData.email, 
        userData.password || ''
      );
      
      console.log('Usuario creado en Auth:', userCredential.user.uid);
      
      // Guardar datos adicionales en Firestore
      const userDoc = {
        email: userData.email,
        nombre: userData.nombre,
        apellido: userData.apellido,
        telefono: userData.telefono || '',
        employeeId: userData.employeeId || '',
        departamento: (userData as any).departamento || '',
        fechaCreacion: Timestamp.now(),
        uid: userCredential.user.uid,
        activo: true
      };
      
      await setDoc(
        doc(this.firestore, 'users', userCredential.user.uid), 
        userDoc
      );
      
      console.log('Datos de usuario guardados en Firestore');
      
      return {
        id: userCredential.user.uid,
        ...userDoc,
        fechaCreacion: new Date()
      } as User;
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Manejar errores específicos de Firebase
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('El correo electrónico ya está registrado');
        case 'auth/weak-password':
          throw new Error('La contraseña es muy débil. Usa al menos 6 caracteres');
        case 'auth/invalid-email':
          throw new Error('El correo electrónico no es válido');
        case 'auth/operation-not-allowed':
          throw new Error('El registro está deshabilitado temporalmente');
        case 'auth/too-many-requests':
          throw new Error('Demasiados intentos. Intenta más tarde');
        default:
          throw new Error('Error al registrar usuario: ' + (error.message || 'Error desconocido'));
      }
    }
  }

  async loginUser(email: string, password: string): Promise<User> {
    try {
      console.log('Iniciando sesión:', email);
      
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );
      
      console.log('Login exitoso en Auth:', userCredential.user.uid);
      
      // Obtener datos adicionales del usuario desde Firestore
      const userDocRef = doc(this.firestore, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Datos de usuario obtenidos de Firestore');
        
        return {
          id: userCredential.user.uid,
          ...userData,
          fechaCreacion: userData['fechaCreacion']?.toDate() || new Date()
        } as User;
      }
      
      throw new Error('Datos de usuario no encontrados en la base de datos');
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Email o contraseña incorrectos');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('El formato del email no es válido');
      }
      if (error.code === 'auth/user-disabled') {
        throw new Error('Esta cuenta ha sido deshabilitada');
      }
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Demasiados intentos fallidos. Intenta más tarde');
      }
      
      throw new Error('Error al iniciar sesión: ' + (error.message || 'Error desconocido'));
    }
  }

  async logoutUser(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('Sesión cerrada exitosamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }

  getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  // =====================
  // GESTIÓN DE ASISTENCIAS
  // =====================

  async saveAttendance(attendance: Attendance): Promise<Attendance> {
    try {
      console.log('Guardando asistencia:', attendance);
      
      const attendanceData = {
        userId: attendance.userId,
        tipo: attendance.tipo,
        fecha: Timestamp.fromDate(new Date(attendance.fecha)),
        hora: attendance.hora,
        ubicacion: attendance.ubicacion,
        fotoUrl: attendance.fotoUrl || '',
        ubicacionValida: attendance.ubicacionValida,
        createdAt: Timestamp.now()
      };
      
      const attendancesRef = collection(this.firestore, 'attendances');
      const docRef = await addDoc(attendancesRef, attendanceData);
      
      console.log('Asistencia guardada con ID:', docRef.id);
      
      return {
        ...attendance,
        id: docRef.id
      };
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      throw new Error('No se pudo guardar la asistencia: ' + (error as Error).message);
    }
  }

  async getUserAttendances(userId?: string): Promise<Attendance[]> {
    try {
      const targetUserId = userId || this.currentUser?.uid;
      if (!targetUserId) {
        console.warn('No hay usuario para obtener asistencias');
        return [];
      }
      
      console.log('Obteniendo asistencias para usuario:', targetUserId);
      
      const attendancesRef = collection(this.firestore, 'attendances');
      const q = query(
        attendancesRef, 
        where('userId', '==', targetUserId),
        orderBy('fecha', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      const attendances = snapshot.docs.map(doc => {
        const data = doc.data();
        const attendance = {
          id: doc.id,
          userId: data['userId'],
          tipo: data['tipo'],
          fecha: data['fecha'].toDate(),
          hora: data['hora'],
          ubicacion: data['ubicacion'],
          fotoUrl: data['fotoUrl'] || '',
          ubicacionValida: data['ubicacionValida']
        } as Attendance;
        
        console.log('Asistencia procesada:', {
          id: attendance.id,
          tipo: attendance.tipo,
          fecha: attendance.fecha.toISOString(),
          hora: attendance.hora
        });
        
        return attendance;
      });
      
      console.log(`Asistencias obtenidas: ${attendances.length} para usuario ${targetUserId}`);
      return attendances;
      
    } catch (error) {
      console.error('Error getting user attendances:', error);
      return [];
    }
  }

  async hasUserRegisteredToday(userId: string, tipo: 'entrada' | 'salida'): Promise<boolean> {
    try {
      const targetUserId = userId || this.currentUser?.uid;
      if (!targetUserId) {
        console.warn('No hay usuario para verificar registro de hoy');
        return false;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      console.log(`Verificando si usuario ${targetUserId} ya registró ${tipo} hoy`);
      console.log('Rango de fechas:', today.toISOString(), 'a', tomorrow.toISOString());
      
      const attendancesRef = collection(this.firestore, 'attendances');
      const q = query(
        attendancesRef,
        where('userId', '==', targetUserId),
        where('tipo', '==', tipo),
        where('fecha', '>=', Timestamp.fromDate(today)),
        where('fecha', '<', Timestamp.fromDate(tomorrow)),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      const hasRegistered = !snapshot.empty;
      
      console.log(`¿Ya registró ${tipo} hoy?`, hasRegistered);
      
      if (hasRegistered) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        console.log('Registro existente:', {
          fecha: data['fecha'].toDate().toISOString(),
          hora: data['hora'],
          tipo: data['tipo']
        });
      }
      
      return hasRegistered;
      
    } catch (error) {
      console.error('Error checking today registration:', error);
      return false;
    }
  }
}