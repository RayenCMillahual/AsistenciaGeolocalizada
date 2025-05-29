// Ubicación: app/pages/history/history.page.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, LoadingController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';
import { Attendance } from '../../models/attendance.model';
import { User } from '../../models/user.model';
import { SharedModule } from '../../shared/shared.module';

interface AttendanceGroup {
  date: Date;
  entrada?: Attendance;
  salida?: Attendance;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SharedModule]
})
export class HistoryPage implements OnInit {
  attendanceHistory: Attendance[] = [];
  groupedAttendances: AttendanceGroup[] = [];
  currentUser: User | null = null;
  selectedSegment = 'week';
  isLoading = false;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private router: Router
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

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Cargando historial...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Obtener todas las asistencias del usuario
      this.attendanceHistory = await this.attendanceService.getUserAttendanceHistory();
      
      // Filtrar por fecha según el segmento seleccionado
      this.filterByDateRange();

      // Agrupar asistencias por fecha
      this.groupAttendancesByDate();

    } catch (error) {
      console.error('Error loading attendance history:', error);
      this.showAlert('Error', 'No se pudo cargar el historial de asistencias');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  filterByDateRange() {
    if (this.attendanceHistory.length === 0) return;

    let startDate: Date;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

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

    startDate.setHours(0, 0, 0, 0);

    // Filtrar las asistencias por rango de fechas
    this.attendanceHistory = this.attendanceHistory.filter(attendance => {
      const attendanceDate = new Date(attendance.fecha);
      return attendanceDate >= startDate && attendanceDate <= endDate;
    });
  }

  groupAttendancesByDate() {
    const grouped: { [key: string]: AttendanceGroup } = {};

    this.attendanceHistory.forEach(attendance => {
      const dateKey = new Date(attendance.fecha).toDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: new Date(attendance.fecha)
        };
      }

      if (attendance.tipo === 'entrada') {
        grouped[dateKey].entrada = attendance;
      } else if (attendance.tipo === 'salida') {
        grouped[dateKey].salida = attendance;
      }
    });

    // Convertir a array y ordenar por fecha descendente
    this.groupedAttendances = Object.values(grouped)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    this.loadAttendanceHistory();
  }

  getWorkingHours(entrada?: Attendance, salida?: Attendance): string {
    if (!entrada || !salida) {
      return 'Incompleto';
    }

    try {
      const entradaTime = new Date(`${new Date(entrada.fecha).toDateString()} ${entrada.hora}`);
      const salidaTime = new Date(`${new Date(salida.fecha).toDateString()} ${salida.hora}`);
      
      if (isNaN(entradaTime.getTime()) || isNaN(salidaTime.getTime())) {
        return 'Error';
      }

      const diff = salidaTime.getTime() - entradaTime.getTime();
      
      if (diff <= 0) {
        return 'Error';
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      return `${hours}h ${minutes}m`;
    } catch (error) {
      console.error('Error calculating working hours:', error);
      return 'Error';
    }
  }

  getWorkingDays(): number {
    return this.groupedAttendances.filter(group => group.entrada && group.salida).length;
  }

  async showDayDetails(group: AttendanceGroup) {
    const entradaInfo = group.entrada ? 
      `<p><strong>Entrada:</strong> ${group.entrada.hora}</p>
       <p><strong>Ubicación válida:</strong> ${group.entrada.ubicacionValida ? 'Sí' : 'No'}</p>` : 
      '<p><strong>Entrada:</strong> No registrada</p>';

    const salidaInfo = group.salida ? 
      `<p><strong>Salida:</strong> ${group.salida.hora}</p>
       <p><strong>Ubicación válida:</strong> ${group.salida.ubicacionValida ? 'Sí' : 'No'}</p>` : 
      '<p><strong>Salida:</strong> No registrada</p>';

    const workingHours = this.getWorkingHours(group.entrada, group.salida);

    const alert = await this.alertController.create({
      header: 'Detalles del Día',
      subHeader: new Date(group.date).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      message: `
        ${entradaInfo}
        ${salidaInfo}
        <p><strong>Horas trabajadas:</strong> ${workingHours}</p>
      `,
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
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
    try {
      await this.loadAttendanceHistory();
    } finally {
      event.target.complete();
    }
  }

  goToHome() {
    this.router.navigate(['/home']);
  }
}