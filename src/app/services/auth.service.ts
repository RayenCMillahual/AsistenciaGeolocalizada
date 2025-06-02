// src/app/services/auth.service.ts - CORREGIDO
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { User } from '../models/user.model';
import { DatabaseService } from './database.service';
import { 
  Auth,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from '@angular/fire/auth';
import { 
  doc, 
  getDoc 
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser: Observable<User | null> = this.currentUserSubject.asObservable();
  
  private isInitialized = false;
  private initializationPromise: Promise<void>;

  constructor(private databaseService: DatabaseService) {
    this.initializationPromise = this.initAuthState();
  }

  private async initAuthState(): Promise<void> {
    try {
      console.log('🔐 Inicializando AuthService...');
      
      // Esperar a que DatabaseService esté listo
      await this.databaseService.waitForInitialization();
      
      // Configurar persistencia
      await setPersistence(this.auth, browserLocalPersistence);
      console.log('✅ Persistencia de Firebase configurada');

      // Configurar listener de autenticación
      await this.setupAuthListener();
      
      this.isInitialized = true;
      console.log('✅ AuthService inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando AuthService:', error);
      this.isInitialized = true; // Marcar como inicializado para evitar bloqueos
    }
  }

  private async setupAuthListener(): Promise<void> {
    return new Promise((resolve) => {
      // Listener que se ejecuta cuando cambia el estado de autenticación
      onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {
        console.log('🔄 Auth state changed:', firebaseUser?.uid || 'No user');
        
        if (firebaseUser) {
          try {
            // Obtener datos del usuario desde Firestore
            const userData = await this.getUserDataFromFirestore(firebaseUser.uid);
            
            if (userData) {
              this.currentUserSubject.next(userData);
              console.log('✅ Usuario autenticado:', userData.email);
            } else {
              // Si no hay datos en Firestore, crear usuario básico
              const basicUser = this.createBasicUserFromFirebase(firebaseUser);
              this.currentUserSubject.next(basicUser);
              console.log('⚠️ Usuario autenticado con datos básicos:', basicUser.email);
            }
          } catch (error) {
            console.error('❌ Error obteniendo datos del usuario:', error);
            // En caso de error, crear usuario básico
            const basicUser = this.createBasicUserFromFirebase(firebaseUser);
            this.currentUserSubject.next(basicUser);
          }
        } else {
          this.currentUserSubject.next(null);
          console.log('👤 Usuario no autenticado');
        }
        
        resolve();
      });
    });
  }

  private async getUserDataFromFirestore(uid: string): Promise<User | null> {
    try {
      const userDocRef = doc(this.databaseService.firestore, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: uid,
          email: data['email'],
          nombre: data['nombre'],
          apellido: data['apellido'],
          telefono: data['telefono'] || '',
          employeeId: data['employeeId'] || '',
          carrera: data['carrera'] || '',
          materia: data['materia'] || data['departamento'] || '', // Compatibilidad
          fechaCreacion: data['fechaCreacion']?.toDate() || new Date(),
          activo: data['activo'] !== false,
          uid: uid
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo datos de Firestore:', error);
      return null;
    }
  }

  private createBasicUserFromFirebase(firebaseUser: FirebaseUser): User {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      nombre: firebaseUser.displayName?.split(' ')[0] || 'Usuario',
      apellido: firebaseUser.displayName?.split(' ')[1] || '',
      telefono: '',
      employeeId: '',
      carrera: '',
      materia: '',
      fechaCreacion: new Date(),
      activo: true,
      uid: firebaseUser.uid
    };
  }

  // =====================
  // MÉTODOS PÚBLICOS
  // =====================

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  async login(email: string, password: string): Promise<User> {
  try {
    console.log('🔐 AuthService: Iniciando login...');
    
    // Esperar inicialización si es necesario
    await this.waitForInitialization();
    
    // Ejecutar login
    const user = await this.databaseService.loginUser(email, password);
    console.log('✅ AuthService: Login exitoso en DatabaseService');
    
    // CRÍTICO: Actualizar inmediatamente el BehaviorSubject
    this.currentUserSubject.next(user);
    console.log('✅ AuthService: BehaviorSubject actualizado con usuario:', user.email);
    
    // SOLUCIÓN ADICIONAL: Forzar emisión del estado
    setTimeout(() => {
      console.log('🔄 AuthService: Forzando re-emisión de usuario');
      this.currentUserSubject.next(user);
    }, 100);
    
    return user;
    
  } catch (error) {
    console.error('❌ AuthService: Error en login:', error);
    // Asegurar que el estado se limpia en caso de error
    this.currentUserSubject.next(null);
    throw error;
  }
}

  async register(userData: User): Promise<User> {
    try {
      console.log('👤 AuthService: Iniciando registro...');
      
      // Esperar inicialización si es necesario
      await this.waitForInitialization();
      
      // Validaciones básicas
      if (!userData.email || !userData.password) {
        throw new Error('Email y contraseña son requeridos');
      }

      if (!userData.nombre || !userData.apellido) {
        throw new Error('Nombre y apellido son requeridos');
      }

      // Llamar al método de registro del DatabaseService
      const user = await this.databaseService.registerUser(userData);
      
      console.log('✅ AuthService: Registro exitoso');
      return user;
      
    } catch (error) {
      console.error('❌ AuthService: Error en registro:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('🚪 AuthService: Cerrando sesión...');
      
      await this.databaseService.logoutUser();
      this.currentUserSubject.next(null);
      
      console.log('✅ AuthService: Sesión cerrada');
      
    } catch (error) {
      console.error('❌ AuthService: Error cerrando sesión:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }

  // =====================
  // MÉTODOS DE UTILIDAD
  // =====================

  async waitForInitialization(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializationPromise;
    }
  }

  async refreshUserData(): Promise<void> {
    const currentUser = this.currentUserValue;
    if (currentUser?.id) {
      try {
        console.log('🔄 Actualizando datos de usuario...');
        
        const userData = await this.getUserDataFromFirestore(currentUser.id);
        
        if (userData) {
          this.currentUserSubject.next(userData);
          console.log('✅ Datos de usuario actualizados');
        }
      } catch (error) {
        console.error('❌ Error actualizando datos de usuario:', error);
      }
    }
  }

  async forceReauth(): Promise<void> {
    if (this.auth.currentUser) {
      try {
        console.log('🔄 Forzando re-autenticación...');
        await this.auth.currentUser.reload();
        console.log('✅ Re-autenticación exitosa');
      } catch (error) {
        console.error('❌ Error en re-autenticación:', error);
        this.currentUserSubject.next(null);
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
    }
  }

  // Método para esperar a que el usuario esté autenticado
  async waitForUser(timeoutMs: number = 10000): Promise<User | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const user = this.currentUserValue;
      if (user !== null) {
        return user;
      }
      
      // Esperar un poco antes de verificar nuevamente
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null;
  }

  // Método para debug y diagnóstico
  getAuthStatus(): any {
    return {
      isInitialized: this.isInitialized,
      isAuthenticated: this.isAuthenticated(),
      currentUser: this.currentUserValue?.email || 'None',
      firebaseUser: this.auth.currentUser?.uid || 'None'
    };
  }

  // Método para forzar actualización del estado
  async forceStateUpdate(): Promise<void> {
    const firebaseUser = this.auth.currentUser;
    if (firebaseUser) {
      const userData = await this.getUserDataFromFirestore(firebaseUser.uid);
      if (userData) {
        this.currentUserSubject.next(userData);
        console.log('✅ Estado actualizado forzadamente');
      }
    }
  }
}