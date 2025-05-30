// src/app/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';
import { DatabaseService } from './database.service';
import { 
  Auth,
  onAuthStateChanged,
  User as FirebaseUser 
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser: Observable<User | null> = this.currentUserSubject.asObservable();
  
  constructor(private databaseService: DatabaseService) {
    this.initAuthState();
  }

  private initAuthState() {
    onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Obtener datos completos del usuario desde Firestore
          const userData = await this.databaseService.loginUser(firebaseUser.email!, '');
          this.currentUserSubject.next(userData);
          console.log('Usuario autenticado:', userData);
        } catch (error) {
          console.error('Error obteniendo datos del usuario:', error);
          this.currentUserSubject.next(null);
        }
      } else {
        this.currentUserSubject.next(null);
        console.log('Usuario no autenticado');
      }
    });
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const user = await this.databaseService.loginUser(email, password);
      this.currentUserSubject.next(user);
      return user;
    } catch (error) {
      throw error;
    }
  }

  async register(userData: User): Promise<User> {
    try {
      const user = await this.databaseService.registerUser(userData);
      // No actualizamos currentUserSubject aquí porque el usuario debe hacer login
      return user;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.databaseService.logoutUser();
      this.currentUserSubject.next(null);
    } catch (error) {
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }
}