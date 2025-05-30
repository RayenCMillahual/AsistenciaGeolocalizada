// src/app/pages/history/history.page.ts
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
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
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
  IonSegment,
  IonSegmentButton,
  IonDatetime,
  IonPopover,
  LoadingController,
  ToastController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, 
  timeOutline, 
  locationOutline, 
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  filterOutline,
  downloadOutline,
  statsChartOutline,
  eyeOutline
} from 'ionicons/icons';

import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';
import { Attendance } from '../../models/attendance.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
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
    IonSegment,
    IonSegmentButton,
    IonDatetime,
    IonPopover
  ]
})
export class HistoryPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  attendances: Attendance[] = [];
  filteredAttendances: Attendance[] = [];
  isLoading = false;
  selectedPeriod = 'month'; // week, month, all
  
  private subscriptions: Subscription[] = [];

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    // Registrar iconos
    addIcons({
      calendarOutline,
      timeOutline,
      locationOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline,
      filterOutline,
      downloadOutline,
      statsChartOutline,
      eyeOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.loadAttendanceHistory();
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

  private async loadAttendanceHistory() {
    this.isLoading = true;
    
    try {
      this.attendances = await this.attendanceService.getUserAttendanceHistory();
      this.applyPeriodFilter();
      console.log('Historial cargado:', this.attendances.length, 'registros');
    } catch (error) {
      console.error('Error cargando historial:', error);
      
      const toast = await this.toastController.create({
        message: 'Error al cargar el historial',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  onPeriodChange() {
    this.applyPeriodFilter();
  }

  private applyPeriodFilter() {
    const now = new Date();
    let filterDate: Date;

    switch (this.selectedPeriod) {
      case 'week':
        filterDate = new Date(now);
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate = new Date(now);
        filterDate.setMonth(now.getMonth() - 1);
        break;
      default:
        // 'all' - mostrar todos
        this.filteredAttendances = [...this.attendances];
        return;
    }

    this.filteredAttendances = this.attendances.filter(attendance => 
      new Date(attendance.fecha) >= filterDate
    );
  }

  async refreshData(event?: any) {
    try {
      await this.loadAttendanceHistory();
      
      if (event) {
        event.target.complete();
      }

      const toast = await this.toastController.create({
        message: 'Historial actualizado',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      if (event) {
        event.target.complete();
      }
      console.error('Error actualizando historial:', error);
    }
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatTime(time: string): string {
    return time || '--:--';
  }

  getTypeColor(tipo: string): string {
    return tipo === 'entrada' ? 'success' : 'danger';
  }

  getTypeIcon(tipo: string): string {
    return tipo === 'entrada' ? 'checkmark-circle-outline' : 'close-circle-outline';
  }

  getLocationStatus(ubicacionValida: boolean): string {
    return ubicacionValida ? 'Válida' : 'Fuera de rango';
  }

  getLocationColor(ubicacionValida: boolean): string {
    return ubicacionValida ? 'success' : 'warning';
  }

  // Agrupar asistencias por fecha
  getGroupedAttendances(): { [key: string]: Attendance[] } {
    const grouped: { [key: string]: Attendance[] } = {};
    
    this.filteredAttendances.forEach(attendance => {
      const dateKey = this.formatDate(attendance.fecha);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(attendance);
    });
    
    return grouped;
  }

  // Obtener claves de fechas ordenadas
  getGroupedDates(): string[] {
    const grouped = this.getGroupedAttendances();
    return Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
  }

  // Estadísticas básicas
  getStats() {
    const total = this.filteredAttendances.length;
    const entradas = this.filteredAttendances.filter(a => a.tipo === 'entrada').length;
    const salidas = this.filteredAttendances.filter(a => a.tipo === 'salida').length;
    const ubicacionesValidas = this.filteredAttendances.filter(a => a.ubicacionValida).length;
    
    return {
      total,
      entradas,
      salidas,
      ubicacionesValidas,
      porcentajeUbicacionValida: total > 0 ? Math.round((ubicacionesValidas / total) * 100) : 0
    };
  }

  getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'week':
        return 'Última semana';
      case 'month':
        return 'Último mes';
      default:
        return 'Todos los registros';
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  viewAttendanceDetail(attendance: Attendance) {
    // Aquí podrías abrir un modal con detalles completos
    console.log('Ver detalles de:', attendance);
  }
}