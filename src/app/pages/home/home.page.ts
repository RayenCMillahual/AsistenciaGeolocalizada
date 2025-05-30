// src/app/pages/home/home.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  logOutOutline, 
  timeOutline, 
  locationOutline, 
  cameraOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  statsChartOutline,
  cardOutline,
  informationCircleOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { User } from '../../models/user.model';
import { Attendance } from '../../models/attendance.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonSpinner,
    IonRefresher,
    IonRefresherContent
  ]
})
export class HomePage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  todayAttendances: {entrada?: Attendance, salida?: Attendance} = {};
  isLoading = false;
  currentTime = new Date();
  
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    // Registrar iconos
    addIcons({
      logOutOutline,
      timeOutline,
      locationOutline,
      cameraOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline,
      statsChartOutline,
      cardOutline,
      informationCircleOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.loadTodayAttendances();
    this.updateTime();
    
    // Actualizar hora cada minuto
    setInterval(() => {
      this.updateTime();
    }, 60000);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadUserData() {
    const userSub = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.subscriptions.push(userSub);
  }

  private loadTodayAttendances() {
    const attendanceSub = this.attendanceService.getTodayAttendances().subscribe(
      attendances => {
        this.todayAttendances = attendances;
        console.log('Asistencias de hoy actualizadas:', attendances);
      }
    );
    this.subscriptions.push(attendanceSub);
  }

  private updateTime() {
    this.currentTime = new Date();
  }

  get canCheckIn(): boolean {
    return this.attendanceService.canCheckIn();
  }

  get canCheckOut(): boolean {
    return this.attendanceService.canCheckOut();
  }

  get currentTimeString(): string {
    return this.currentTime.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get currentDateString(): string {
    return this.currentTime.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  async registerEntry() {
    await this.registerAttendance('entrada');
  }

  async registerExit() {
    await this.registerAttendance('salida');
  }

  private async registerAttendance(tipo: 'entrada' | 'salida') {
    const loading = await this.loadingController.create({
      message: `Registrando ${tipo}...`,
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const attendance = await this.attendanceService.registerAttendance(tipo);
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada exitosamente`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      console.log(`${tipo} registrada:`, attendance);

    } catch (error) {
      await loading.dismiss();
      console.error(`Error registrando ${tipo}:`, error);

      const alert = await this.alertController.create({
        header: 'Error',
        message: (error as Error).message || `Error al registrar ${tipo}`,
        buttons: ['Aceptar']
      });
      await alert.present();
    }
  }

  async refreshData(event?: any) {
    try {
      await this.attendanceService.forceRefresh();
      
      if (event) {
        event.target.complete();
      }

      const toast = await this.toastController.create({
        message: 'Datos actualizados',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      if (event) {
        event.target.complete();
      }
      
      console.error('Error actualizando datos:', error);
    }
  }

  goToHistory() {
    this.router.navigate(['/history']);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          handler: async () => {
            try {
              await this.authService.logout();
              this.router.navigate(['/login']);
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getAttendanceStatusText(): string {
    if (this.todayAttendances.entrada && this.todayAttendances.salida) {
      return 'Jornada Completada';
    } else if (this.todayAttendances.entrada) {
      return 'En el Trabajo';
    } else {
      return 'Sin Registrar';
    }
  }

  getAttendanceStatusColor(): string {
    if (this.todayAttendances.entrada && this.todayAttendances.salida) {
      return 'success';
    } else if (this.todayAttendances.entrada) {
      return 'warning';
    } else {
      return 'medium';
    }
  }
}