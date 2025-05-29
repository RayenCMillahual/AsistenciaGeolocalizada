import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  collectionData,
  doc,
  setDoc,
  getDoc,
  Timestamp
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
  private _locations = new BehaviorSubject<ValidLocation[]>([]);
  private currentUser: FirebaseUser | null = null;
  
  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {
    this.init();
  }

  async init() {
    await this.loadLocations();
    await this.seedDefaultLocation();
    
    // Escuchar cambios de autenticación
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
  }

  // =====================
  // GESTIÓN DE UBICACIONES
  // =====================
  
  private async seedDefaultLocation() {
    const locations = await this.getLocations();
    if (locations.length === 0) {
      const defaultLocation: ValidLocation = {
        id: '1',
        nombre: 'Oficina Principal',
        latitud: -34.603722,
        longitud: -58.381592,
        radioPermitido: 100
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
        // Si tiene ID, usar setDoc
        await setDoc(doc(this.firestore, 'locations', location.id), location);
      } else {
        // Si no tiene ID, usar addDoc (genera ID automático)
        await addDoc(locationsRef, location);
      }
      
      await this.loadLocations(); // Recargar ubicaciones
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
    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      this.auth, 
      userData.email, 
      userData.password || ''
    );
    
    // Guardar datos adicionales en Firestore
    const userDoc = {
      email: userData.email,
      nombre: userData.nombre,
      apellido: userData.apellido,
      telefono: userData.telefono || '',
      employeeId: userData.employeeId || '',
      departamento: (userData as any).departamento || '', // Agregar departamento
      fechaCreacion: Timestamp.now(),
      uid: userCredential.user.uid,
      activo: true // Campo adicional para control de usuarios
    };
    
    await setDoc(
      doc(this.firestore, 'users', userCredential.user.uid), 
      userDoc
    );
    
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
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        email, 
        password
      );
      
      // Obtener datos adicionales del usuario desde Firestore
      const userDocRef = doc(this.firestore, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: userCredential.user.uid,
          ...userData,
          fechaCreacion: userData['fechaCreacion']?.toDate() || new Date()
        } as User;
      }
      
      throw new Error('Datos de usuario no encontrados');
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Email o contraseña incorrectos');
      }
      throw new Error('Error al iniciar sesión: ' + error.message);
    }
  }

  async logoutUser(): Promise<void> {
    try {
      await signOut(this.auth);
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
      const attendanceData = {
        ...attendance,
        fecha: Timestamp.fromDate(new Date(attendance.fecha)),
        userId: this.currentUser?.uid || attendance.userId
      };
      
      const attendancesRef = collection(this.firestore, 'attendances');
      const docRef = await addDoc(attendancesRef, attendanceData);
      
      return {
        ...attendance,
        id: docRef.id
      };
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      throw error;
    }
  }

  async getAttendances(): Promise<Attendance[]> {
    try {
      const attendancesRef = collection(this.firestore, 'attendances');
      const q = query(attendancesRef, orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data()['fecha'].toDate()
      } as Attendance));
      
    } catch (error) {
      console.error('Error getting attendances:', error);
      return [];
    }
  }

  async getUserAttendances(userId?: string): Promise<Attendance[]> {
    try {
      const targetUserId = userId || this.currentUser?.uid;
      if (!targetUserId) {
        throw new Error('No hay usuario autenticado');
      }
      
      const attendancesRef = collection(this.firestore, 'attendances');
      const q = query(
        attendancesRef, 
        where('userId', '==', targetUserId),
        orderBy('fecha', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data()['fecha'].toDate()
      } as Attendance));
      
    } catch (error) {
      console.error('Error getting user attendances:', error);
      return [];
    }
  }

  async hasUserRegisteredToday(userId: string, tipo: 'entrada' | 'salida'): Promise<boolean> {
    try {
      const targetUserId = userId || this.currentUser?.uid;
      if (!targetUserId) return false;
      
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
        where('fecha', '<', Timestamp.fromDate(tomorrow))
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
      
    } catch (error) {
      console.error('Error checking today registration:', error);
      return false;
    }
  }

  // =====================
  // OBSERVABLES EN TIEMPO REAL
  // =====================
  
  getUserAttendancesObservable(userId?: string): Observable<Attendance[]> {
    const targetUserId = userId || this.currentUser?.uid;
    if (!targetUserId) {
      return new Observable(observer => observer.next([]));
    }
    
    const attendancesRef = collection(this.firestore, 'attendances');
    const q = query(
      attendancesRef,
      where('userId', '==', targetUserId),
      orderBy('fecha', 'desc')
    );
    
    return collectionData(q, { idField: 'id' }) as Observable<Attendance[]>;
  }
}