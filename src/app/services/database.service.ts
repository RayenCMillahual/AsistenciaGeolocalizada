// src/app/services/database.service.ts - CORREGIDO
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
  limit,
  connectFirestoreEmulator
} from '@angular/fire/firestore';
import { 
  Auth,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator
} from '@angular/fire/auth';
import { User } from '../models/user.model';
import { Attendance } from '../models/attendance.model';
import { ValidLocation } from '../models/location.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  public firestore = inject(Firestore);
  private auth = inject(Auth);
  
  private _locations = new BehaviorSubject<ValidLocation[]>([]);
  private currentUser: FirebaseUser | null = null;
  private persistenceConfigured = false;
  private initializationPromise: Promise<void>;
  
  constructor() {
    // Inicialización mejorada y sin llamadas async en constructor
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🚀 Inicializando DatabaseService...');
    
    try {
      // 1. Configurar persistencia primero
      await this.configurePersistence();
      
      // 2. Configurar listener de auth
      this.setupAuthListener();
      
      // 3. Cargar ubicaciones con timeout
      await Promise.race([
        this.loadLocationsWithFallback(),
        new Promise(resolve => setTimeout(resolve, 5000)) // timeout 5s
      ]);
      
      console.log('✅ DatabaseService inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando DatabaseService:', error);
      // Continuar con valores por defecto
      this.setupDefaultData();
    }
  }

  private setupAuthListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      console.log('🔐 Estado de auth cambió:', user?.uid || 'No user');
    });
  }

  private async configurePersistence(): Promise<void> {
    if (this.persistenceConfigured) return;
    
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      this.persistenceConfigured = true;
      console.log('✅ Persistencia de Firebase Auth configurada');
    } catch (error) {
      console.warn('⚠️ No se pudo configurar persistencia:', error);
      this.persistenceConfigured = true; // Marcar como configurada para evitar reintentos
    }
  }

  private async loadLocationsWithFallback(): Promise<void> {
    try {
      await this.loadLocations();
      await this.seedDefaultLocation();
    } catch (error) {
      console.error('❌ Error cargando ubicaciones:', error);
      this.setupDefaultData();
    }
  }

  private setupDefaultData(): void {
    const defaultLocation: ValidLocation = {
      id: '1',
      nombre: 'ITS Cipolletti - Campus Principal',
      latitud: -38.9516,
      longitud: -68.0591,
      radioPermitido: 500
    };
    this._locations.next([defaultLocation]);
    console.log('📍 Ubicación por defecto configurada');
  }

  // =====================
  // GESTIÓN DE UBICACIONES
  // =====================
  
  private async seedDefaultLocation(): Promise<void> {
    try {
      const locations = await this.getLocations();
      if (locations.length === 0) {
        console.log('📍 Creando ubicación por defecto...');
        const defaultLocation: ValidLocation = {
          id: '1',
          nombre: 'ITS Cipolletti - Campus Principal',
          latitud: -38.9516,
          longitud: -68.0591,
          radioPermitido: 500
        };
        await this.addLocation(defaultLocation);
      }
    } catch (error) {
      console.error('❌ Error creando ubicación por defecto:', error);
    }
  }

  async loadLocations(): Promise<ValidLocation[]> {
    try {
      console.log('📍 Cargando ubicaciones desde Firestore...');
      const locationsRef = collection(this.firestore, 'locations');
      const snapshot = await getDocs(locationsRef);
      
      const locations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ValidLocation));
      
      this._locations.next(locations);
      console.log('✅ Ubicaciones cargadas:', locations.length);
      return locations;
      
    } catch (error) {
      console.error('❌ Error loading locations:', error);
      
      // Fallback con ubicación por defecto
      const defaultLocation: ValidLocation = {
        id: '1',
        nombre: 'ITS Cipolletti - Campus Principal',
        latitud: -38.9516,
        longitud: -68.0591,
        radioPermitido: 500
      };
      
      this._locations.next([defaultLocation]);
      return [defaultLocation];
    }
  }

  getLocationsAsObservable(): Observable<ValidLocation[]> {
    return this._locations.asObservable();
  }

  async getLocations(): Promise<ValidLocation[]> {
    // Esperar inicialización si aún no está completa
    await this.initializationPromise;
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
      console.log('✅ Ubicación agregada exitosamente');
      
    } catch (error) {
      console.error('❌ Error adding location:', error);
      
      // Fallback: actualizar solo estado local
      const currentLocations = this._locations.value;
      if (!currentLocations.find(l => l.id === location.id)) {
        if (!location.id) {
          location.id = Math.random().toString(36).substr(2, 9);
        }
        currentLocations.push(location);
        this._locations.next([...currentLocations]);
      }
      
      console.log('📍 Ubicación agregada solo en memoria');
    }
  }

  // =====================
  // GESTIÓN DE USUARIOS - MEJORADA
  // =====================

  async registerUser(userData: User): Promise<User> {
    try {
      console.log('👤 Registrando usuario:', userData.email);
      
      // Esperar inicialización completa
      await this.initializationPromise;
      
      // Validar datos básicos
      if (!userData.email || !userData.password) {
        throw new Error('Email y contraseña son requeridos');
      }

      if (!userData.nombre || !userData.apellido) {
        throw new Error('Nombre y apellido son requeridos');
      }
      
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        userData.email, 
        userData.password
      );
      
      console.log('✅ Usuario creado en Auth:', userCredential.user.uid);
      
      // Preparar datos para Firestore (sin contraseña)
      const userDoc = {
        email: userData.email,
        nombre: userData.nombre.trim(),
        apellido: userData.apellido.trim(),
        telefono: userData.telefono?.trim() || '',
        employeeId: userData.employeeId?.trim() || '',
        carrera: userData.carrera?.trim() || '',
        materia: userData.materia?.trim() || '',
        fechaCreacion: Timestamp.now(),
        uid: userCredential.user.uid,
        activo: true
      };
      
      // Guardar en Firestore con manejo de errores mejorado
      try {
        await setDoc(
          doc(this.firestore, 'users', userCredential.user.uid), 
          userDoc
        );
        console.log('✅ Datos de usuario guardados en Firestore');
      } catch (firestoreError) {
        console.warn('⚠️ Error guardando en Firestore:', firestoreError);
        // El usuario ya está creado en Auth, así que no es un error fatal
      }
      
      return {
        id: userCredential.user.uid,
        ...userDoc,
        fechaCreacion: new Date()
      } as User;
      
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      
      // Mapeo de errores mejorado
      const errorMap: {[key: string]: string} = {
        'auth/email-already-in-use': 'El correo electrónico ya está registrado',
        'auth/weak-password': 'La contraseña es muy débil. Usa al menos 6 caracteres',
        'auth/invalid-email': 'El correo electrónico no es válido',
        'auth/operation-not-allowed': 'El registro está deshabilitado temporalmente',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
      };
      
      const errorMessage = errorMap[error.code] || `Error al registrar usuario: ${error.message}`;
      throw new Error(errorMessage);
    }
  }

  async loginUser(email: string, password: string): Promise<User> {
    try {
      console.log('🔐 === INICIO LOGIN ===');
      console.log('📧 Email:', email);
      
      // Esperar inicialización completa
      await this.initializationPromise;
      
      // Validaciones básicas
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      if (!email.includes('@')) {
        throw new Error('Formato de email inválido');
      }
      
      // Autenticación con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Login exitoso en Auth:', userCredential.user.uid);
      
      // Obtener datos de usuario de Firestore
      let userData: any = null;
      try {
        const userDocRef = doc(this.firestore, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          userData = userDoc.data();
          console.log('✅ Datos obtenidos de Firestore');
        } else {
          console.warn('⚠️ Usuario no existe en Firestore');
        }
      } catch (firestoreError) {
        console.warn('⚠️ Error accediendo a Firestore:', firestoreError);
      }
      
      // Construir objeto User
      const user: User = {
        id: userCredential.user.uid,
        email: userData?.email || userCredential.user.email!,
        nombre: userData?.nombre || userCredential.user.displayName?.split(' ')[0] || 'Usuario',
        apellido: userData?.apellido || userCredential.user.displayName?.split(' ')[1] || '',
        telefono: userData?.telefono || '',
        employeeId: userData?.employeeId || '',
        carrera: userData?.carrera || '',
        materia: userData?.materia || userData?.departamento || '', // Compatibilidad
        fechaCreacion: userData?.fechaCreacion?.toDate() || new Date(),
        activo: userData?.activo !== false,
        uid: userCredential.user.uid
      };
      
      console.log('✅ Login completado exitosamente');
      return user;
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Mapeo de errores mejorado
      const errorMap: {[key: string]: string} = {
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-credential': 'Credenciales inválidas',
        'auth/invalid-email': 'Formato de email inválido',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
      };
      
      const errorMessage = errorMap[error.code] || `Error al iniciar sesión: ${error.message}`;
      throw new Error(errorMessage);
    }
  }

  async logoutUser(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('✅ Sesión cerrada exitosamente');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      throw new Error('Error al cerrar sesión');
    }
  }

  getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  // =====================
  // GESTIÓN DE ASISTENCIAS - MEJORADA
  // =====================

  async saveAttendance(attendance: Attendance): Promise<Attendance> {
    try {
      console.log('📝 Guardando asistencia:', attendance);
      
      // Validaciones básicas
      if (!attendance.userId || !attendance.tipo) {
        throw new Error('Datos de asistencia incompletos');
      }
      
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
      
      console.log('✅ Asistencia guardada con ID:', docRef.id);
      
      return {
        ...attendance,
        id: docRef.id
      };
      
    } catch (error) {
      console.error('❌ Error saving attendance:', error);
      throw new Error(`No se pudo guardar la asistencia: ${(error as Error).message}`);
    }
  }

  async getUserAttendances(userId?: string): Promise<Attendance[]> {
    try {
      const targetUserId = userId || this.currentUser?.uid;
      if (!targetUserId) {
        console.warn('⚠️ No hay usuario para obtener asistencias');
        return [];
      }
      
      console.log('📋 Obteniendo asistencias para usuario:', targetUserId);
      
      const attendancesRef = collection(this.firestore, 'attendances');
      const q = query(
        attendancesRef, 
        where('userId', '==', targetUserId),
        orderBy('fecha', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      const attendances = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data['userId'],
          tipo: data['tipo'],
          fecha: data['fecha'].toDate(),
          hora: data['hora'],
          ubicacion: data['ubicacion'],
          fotoUrl: data['fotoUrl'] || '',
          ubicacionValida: data['ubicacionValida']
        } as Attendance;
      });
      
      console.log(`✅ Asistencias obtenidas: ${attendances.length}`);
      return attendances;
      
    } catch (error) {
      console.error('❌ Error getting user attendances:', error);
      return [];
    }
  }

  async hasUserRegisteredToday(userId: string, tipo: 'entrada' | 'salida'): Promise<boolean> {
    try {
      const targetUserId = userId || this.currentUser?.uid;
      if (!targetUserId) {
        return false;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
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
      
      console.log(`✅ ¿Ya registró ${tipo} hoy?`, hasRegistered);
      return hasRegistered;
      
    } catch (error) {
      console.error('❌ Error checking today registration:', error);
      return false;
    }
  }

  // =====================
  // MÉTODOS DE UTILIDAD
  // =====================

  async waitForInitialization(): Promise<void> {
    return this.initializationPromise;
  }

  isInitialized(): boolean {
    return this.persistenceConfigured;
  }

  // Método para obtener información de debugging
  getServiceStatus(): any {
    return {
      initialized: this.isInitialized(),
      currentUser: this.currentUser?.uid || 'None',
      persistenceConfigured: this.persistenceConfigured,
      locationsCount: this._locations.value.length
    };
  }
}