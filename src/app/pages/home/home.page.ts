// src/app/pages/home/home.page.ts - ACTUALIZADO CON NUEVO HEADER
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { 
  IonContent, 
  IonCard,
  IonCardContent,
  IonText,
  IonAvatar,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonIcon,
  AlertController,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  timeOutline, 
  personOutline,
  calendarOutline,
  chevronForward,
  logInOutline,
  logOutOutline as logOutIcon,
  checkmarkCircleOutline,
  alertCircleOutline,
  locationOutline,
  bookOutline,
  flashOutline,
  informationCircleOutline,
  settingsOutline,
  helpCircleOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { User } from '../../models/user.model';
import { Attendance } from '../../models/attendance.model';

// Importar el nuevo header
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonText,
    IonAvatar,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonButton,
    IonIcon,
    HeaderComponent // Importar el header component
  ]
})
export class HomePage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  todayAttendances: {entrada?: Attendance, salida?: Attendance} = {};
  currentTime = new Date();
  isLoading = false;
  actionType: 'entrada' | 'salida' | null = null;
  
  private subscriptions: Subscription[] = [];
  private timeSubscription?: Subscription;

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
      timeOutline,
      personOutline,
      calendarOutline,
      chevronForward,
      logInOutline,
      logOutIcon,
      checkmarkCircleOutline,
      alertCircleOutline,
      locationOutline,
      bookOutline,
      flashOutline,
      informationCircleOutline,
      settingsOutline,
      helpCircleOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.loadTodayAttendances();
    this.startTimeUpdates();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.timeSubscription?.unsubscribe();
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
      }
    );
    this.subscriptions.push(attendanceSub);
  }

  private startTimeUpdates() {
    this.updateTime();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.updateTime();
    });
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

  get currentSecondsString(): string {
    return this.currentTime.toLocaleTimeString('es-AR', {
      second: '2-digit'
    }).split(':')[2];
  }

  get currentDateString(): string {
    return this.currentTime.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getGreeting(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
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

  calculateWorkingHours(): string {
    if (!this.todayAttendances.entrada || !this.todayAttendances.salida) {
      return '0h 0m';
    }

    const [entradaHour, entradaMin] = this.todayAttendances.entrada.hora.split(':').map(Number);
    const [salidaHour, salidaMin] = this.todayAttendances.salida.hora.split(':').map(Number);

    const entradaMinutes = entradaHour * 60 + entradaMin;
    const salidaMinutes = salidaHour * 60 + salidaMin;

    const totalMinutes = salidaMinutes - entradaMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  }

  async registerEntry() {
    await this.registerAttendance('entrada');
  }

  async registerExit() {
    await this.registerAttendance('salida');
  }

  private async registerAttendance(tipo: 'entrada' | 'salida') {
    this.isLoading = true;
    this.actionType = tipo;
    
    const loading = await this.loadingController.create({
      message: `Registrando ${tipo}...`,
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const attendance = await this.attendanceService.registerAttendance(tipo);
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: `✅ ${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada exitosamente a las ${attendance.hora}`,
        duration: 4000,
        color: 'success',
        position: 'top',
        buttons: [
          {
            text: 'Ver detalles',
            handler: () => {
              this.showAttendanceDetails(attendance);
            }
          }
        ]
      });
      await toast.present();

    } catch (error) {
      await loading.dismiss();

      const alert = await this.alertController.create({
        header: 'Error',
        message: (error as Error).message || `Error al registrar ${tipo}`,
        buttons: ['Aceptar']
      });
      await alert.present();
    } finally {
      this.isLoading = false;
      this.actionType = null;
    }
  }

  async showAttendanceDetails(attendance: Attendance) {
    const alert = await this.alertController.create({
      header: `Detalles de ${attendance.tipo}`,
      message: `
        <strong>Hora:</strong> ${attendance.hora}<br>
        <strong>Fecha:</strong> ${attendance.fecha.toLocaleDateString('es-AR')}<br>
        <strong>Ubicación válida:</strong> ${attendance.ubicacionValida ? 'Sí' : 'No'}<br>
        <strong>Coordenadas:</strong> ${attendance.ubicacion.latitud.toFixed(6)}, ${attendance.ubicacion.longitud.toFixed(6)}
      `,
      buttons: ['Cerrar']
    });
    await alert.present();
  }

  async refreshData(event?: any) {
    try {
      await this.attendanceService.forceRefresh();
      
      if (event) {
        event.target.complete();
      }

      const toast = await this.toastController.create({
        message: '✅ Datos actualizados',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      if (event) {
        event.target.complete();
      }
      
      const toast = await this.toastController.create({
        message: '❌ Error al actualizar datos',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  // =====================
  // MÉTODOS PARA EL NUEVO HEADER
  // =====================

  goToNotifications() {
    // TODO: Implementar página de notificaciones
    this.showNotImplementedToast('Notificaciones');
  }

  goToProfile() {
    // TODO: Implementar página de perfil
    this.showNotImplementedToast('Perfil de Usuario');
  }

  goToSettings() {
    // TODO: Implementar página de configuración
    this.showNotImplementedToast('Configuración');
  }

  goToHistory() {
    this.router.navigate(['/history']);
  }

  async showHelp() {
    const alert = await this.alertController.create({
      header: 'Ayuda - Sistema de Asistencia',
      message: `
        <strong>¿Cómo usar el sistema?</strong><br><br>
        
        <strong>1. Registrar Entrada:</strong><br>
        • Presiona "Registrar Entrada" al llegar<br>
        • Asegúrate de estar en el ITS<br>
        • Permite el acceso a ubicación y cámara<br><br>
        
        <strong>2. Registrar Salida:</strong><br>
        • Presiona "Registrar Salida" al irte<br>
        • Solo puedes registrar salida después de la entrada<br><br>
        
        <strong>3. Ver Historial:</strong><br>
        • Toca "Historial" para ver tus registros<br>
        • Puedes filtrar por período<br><br>
        
        <strong>¿Problemas?</strong><br>
        Contacta al administrador del sistema.
      `,
      buttons: ['Entendido']
    });
    await alert.present();
  }

  private async showNotImplementedToast(feature: string) {
    const toast = await this.toastController.create({
      message: `🚧 ${feature} - Próximamente disponible`,
      duration: 2000,
      color: 'warning',
      position: 'top'
    });
    await toast.present();
  }
}