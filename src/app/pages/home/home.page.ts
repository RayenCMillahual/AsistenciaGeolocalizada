import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { GeolocationService } from '../../services/geolocation.service';
import { CameraService } from '../../services/camera.service';
import { User } from '../../models/user.model';
import { Attendance } from '../../models/attendance.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  todayAttendance: {entrada?: Attendance, salida?: Attendance} = {};
  currentTime = new Date();
  clockInterval: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private geolocationService: GeolocationService,
    private cameraService: CameraService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.startClock();
    this.loadTodayAttendance();
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  startClock() {
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  async loadUserData() {
    try {
      this.subscriptions.push(
        this.authService.currentUser.subscribe(user => {
          this.currentUser = user;
          if (user) {
            this.loadTodayAttendance();
          }
        })
      );
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async loadTodayAttendance() {
    if (this.currentUser) {
      try {
        this.subscriptions.push(
          this.attendanceService.getTodayAttendances().subscribe(data => {
            this.todayAttendance = data;
          }, error => {
            console.error('Error loading attendance:', error);
          })
        );
      } catch (error) {
        console.error('Error loading attendance:', error);
      }
    }
  }

  async markAttendance(type: 'entrada' | 'salida') {
    const loading = await this.loadingController.create({
      message: type === 'entrada' ? 'Registrando entrada...' : 'Registrando salida...'
    });
    await loading.present();

    try {
      // Registrar asistencia usando el servicio
      const attendance = await this.attendanceService.registerAttendance(type);

      await loading.dismiss();
      
      if (attendance) {
        this.showToast(
          type === 'entrada' ? 'Entrada registrada exitosamente' : 'Salida registrada exitosamente',
          'success'
        );
        // No necesitamos llamar loadTodayAttendance ya que el servicio actualiza automáticamente
      }
      
    } catch (error) {
      await loading.dismiss();
      this.showAlert('Error', error instanceof Error ? error.message : 'No se pudo registrar la asistencia');
      console.error('Error marking attendance:', error);
    }
  }

  async showConfirmation(type: 'entrada' | 'salida') {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: `¿Deseas registrar tu ${type === 'entrada' ? 'entrada' : 'salida'}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: () => {
            this.markAttendance(type);
          }
        }
      ]
    });
    await alert.present();
  }

  canCheckIn(): boolean {
    return !this.todayAttendance.entrada;
  }

  canCheckOut(): boolean {
    return !!this.todayAttendance.entrada && !this.todayAttendance.salida;
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  goToHistory() {
    this.router.navigate(['/history']);
  }

  goToAttendance() {
    this.router.navigate(['/attendance']);
  }
}