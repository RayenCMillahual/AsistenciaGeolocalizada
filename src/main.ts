// Ubicación: src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';

// Firebase imports
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { firebaseConfig } from './app/services/firebase-config';

// Services
import { AuthService } from './app/services/auth.service';
import { DatabaseService } from './app/services/database.service';
import { AttendanceService } from './app/services/attendance.service';
import { GeolocationService } from './app/services/geolocation.service';
import { CameraService } from './app/services/camera.service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      rippleEffect: false,
      mode: 'ios'
    }),
    provideRouter(routes),
    provideHttpClient(),
    
    // Configuración de Firebase
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    
    // Services
    AuthService,
    DatabaseService,
    AttendanceService,
    GeolocationService,
    CameraService
  ],
}).catch(err => console.error(err));