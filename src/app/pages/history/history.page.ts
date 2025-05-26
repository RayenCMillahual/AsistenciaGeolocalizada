import { Component, OnInit } from '@angular/core';
import { LoadingController, AlertController } from '@ionic/angular';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';
import { Attendance } from '../../models/attendance.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
})
export class HistoryPage implements OnInit {
  attendanceHistory: Attendance[] = [];
  currentUser: User | null = null;
  selectedSegment = 'week';
  isLoading = false;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.loadUserData();
    await this.loadAttendanceHistory();
  }

  async loadUserData() {
    try {
      this.currentUser = this.authService.currentUserValue;
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async loadAttendanceHistory() {
    if (!this.currentUser) return;

    const loading = await this.loadingController.create({
      message: 'Cargando historial...'
    });
    await loading.present();

    try {
      // Usar el método correcto del servicio
      this.attendanceHistory = await this.attendanceService.getUserAttendanceHistory();
      
      // Filtrar por fecha según el segmento seleccionado
      this.filterByDateRange();

    } catch (error) {
      console.error('Error loading attendance history:', error);
      this.showAlert('Error', 'No se pudo cargar el historial');
    } finally {
      await loading.dismiss();
    }
  }

  filterByDateRange() {
    if (this.attendanceHistory.length === 0) return;

    let startDate: Date;
    const endDate = new Date();

    switch (this.selectedSegment) {
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
    }

    // Filtrar las asistencias por rango de fechas
    this.attendanceHistory = this.attendanceHistory.filter(attendance => {
      const attendanceDate = new Date(attendance.fecha);
      return attendanceDate >= startDate && attendanceDate <= endDate;
    });
  }

  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    this.loadAttendanceHistory();
  }

  getWorkingHours(entrada: Attendance, salida: Attendance): string {
    if (!entrada || !salida) {
      return 'Incompleto';
    }

    const checkInTime = new Date(`${entrada.fecha}T${entrada.hora}`);
    const checkOutTime = new Date(`${salida.fecha}T${salida.hora}`);
    const diff = checkOutTime.getTime() - checkInTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  // Agrupar asistencias por fecha para mostrar entrada y salida juntas
  getGroupedAttendances(): {[key: string]: {entrada?: Attendance, salida?: Attendance}} {
    const grouped: {[key: string]: {entrada?: Attendance, salida?: Attendance}} = {};

    this.attendanceHistory.forEach(attendance => {
      const dateKey = new Date(attendance.fecha).toDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }

      if (attendance.tipo === 'entrada') {
        grouped[dateKey].entrada = attendance;
      } else if (attendance.tipo === 'salida') {
        grouped[dateKey].salida = attendance;
      }
    });

    return grouped;
  }

  async showAttendanceDetails(entrada?: Attendance, salida?: Attendance) {
    if (!entrada && !salida) return;

    const date = entrada ? entrada.fecha : salida!.fecha;
    const entradaTime = entrada ? entrada.hora : 'N/A';
    const salidaTime = salida ? salida.hora : 'N/A';
    const workingHours = entrada && salida ? this.getWorkingHours(entrada, salida) : 'Incompleto';

    const alert = await this.alertController.create({
      header: 'Detalles de Asistencia',
      message: `
        <p><strong>Fecha:</strong> ${new Date(date).toLocaleDateString()}</p>
        <p><strong>Entrada:</strong> ${entradaTime}</p>
        <p><strong>Salida:</strong> ${salidaTime}</p>
        <p><strong>Horas trabajadas:</strong> ${workingHours}</p>
        <p><strong>Estado:</strong> ${entrada && salida ? 'Completo' : 'Incompleto'}</p>
      `,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async doRefresh(event: any) {
    await this.loadAttendanceHistory();
    event.target.complete();
  }
}