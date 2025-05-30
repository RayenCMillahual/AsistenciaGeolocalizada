// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

// Firebase imports simplificados y funcionales
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { routes } from './app.routes';

// Configuración de Firebase (movida aquí para simplicidad)
const firebaseConfig = {
  apiKey: "AIzaSyBF8Vf1wz9Qz_lfeKq1vAOxB7g76c6h-IQ",
  authDomain: "sistema-asistencias-418ad.firebaseapp.com",
  projectId: "sistema-asistencias-418ad",
  storageBucket: "sistema-asistencias-418ad.firebasestorage.app",
  messagingSenderId: "81431533973",
  appId: "1:81431533973:web:00ca4345cbf77752b5be9c",
  measurementId: "G-LMSCY4276T"
};

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      rippleEffect: false,
      mode: 'ios'
    }),
    provideRouter(routes),
    
    // Firebase Configuration simplificada y estable
    provideFirebaseApp(() => {
      const app = initializeApp(firebaseConfig);
      console.log('Firebase App inicializada');
      return app;
    }),
    
    // Firestore básico (más estable)
    provideFirestore(() => {
      const firestore = getFirestore();
      console.log('Firestore inicializado');
      return firestore;
    }),
    
    // Auth básico (más estable)
    provideAuth(() => {
      const auth = getAuth();
      console.log('Auth inicializado');
      return auth;
    })
  ]
};