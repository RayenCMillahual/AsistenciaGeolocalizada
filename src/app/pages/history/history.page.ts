// src/app/pages/history/history.page.ts - ACTUALIZADO CON NUEVO HEADER
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { 
  IonContent, 
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
  IonIcon,
  LoadingController,
  ToastController,
  ModalController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, 
  timeOutline, 
  locationOutline, 
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  statsChartOutline,
  eyeOutline,
  informationCircleOutline,
  searchOutline
} from 'ionicons/icons';

import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';
import { Attendance } from '../../models/attendance.model';
import { User } from '../../models/user.model';

// Importar el nuevo header
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
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
    IonIcon,
    HeaderComponent // Importar el header component
  ]
})
export class HistoryPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  attendances: Attendance[] = [];
  filteredAttendances: Attendance[] = [];
  isLoading = false;
  loadingProgress = 0;
  selectedPeriod = 'month'; // week, month, all
  searchTerm = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Registrar iconos
    addIcons({
      calendarOutline,
      timeOutline,
      locationOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline,
      statsChartOutline,
      eyeOutline,
      informationCircleOutline,
      searchOutline
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
    this.loadingProgress = 0;
    
    try {
      // Simular progreso de carga
      this.loadingProgress = 25;
      
      this.attendances = await this.attendanceService.getUserAttendanceHistory();
      this.loadingProgress = 75;
      
      this.applyPeriodFilter();
      this.loadingProgress = 100;
      
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
      this.loadingProgress = 0;
    }
  }

  onPeriodChange() {
    this.applyPeriodFilter();
  }

  private applyPeriodFilter() {
    const now = new Date();
    let filterDate: Date;
    let filtered = [...this.attendances];

    // Aplicar filtro de período
    switch (this.selectedPeriod) {
      case 'week':
        filterDate = new Date(now);
        filterDate.setDate(now.getDate() - 7);
        filtered = filtered.filter(attendance => 
          new Date(attendance.fecha) >= filterDate
        );
        break;
      case 'month':
        filterDate = new Date(now);
        filterDate.setMonth(now.getMonth() - 1);
        filtered = filtered.filter(attendance => 
          new Date(attendance.fecha) >= filterDate
        );
        break;
      default:
        // 'all' - mostrar todos
        break;
    }

    // Aplicar filtro de búsqueda si existe
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(attendance => {
        const dateStr = this.formatDate(attendance.fecha).toLowerCase();
        const timeStr = attendance.hora.toLowerCase();
        const typeStr = attendance.tipo.toLowerCase();
        const locationStr = this.getLocationStatus(attendance.ubicacionValida).toLowerCase();
        
        return dateStr.includes(searchLower) || 
               timeStr.includes(searchLower) || 
               typeStr.includes(searchLower) ||
               locationStr.includes(searchLower);
      });
    }

    this.filteredAttendances = filtered;
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

  // =====================
  // MÉTODOS PARA EL NUEVO HEADER
  // =====================

  async onSearchAttendances() {
    const alert = await this.alertController.create({
      header: 'Buscar Asistencias',
      message: 'Busca por fecha, hora, tipo o estado de ubicación',
      inputs: [
        {
          name: 'searchTerm',
          type: 'text',
          placeholder: 'Ej: entrada, 08:30, válida...',
          value: this.searchTerm
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Limpiar',
          handler: () => {
            this.searchTerm = '';
            this.applyPeriodFilter();
          }
        },
        {
          text: 'Buscar',
          handler: (data) => {
            this.searchTerm = data.searchTerm || '';
            this.applyPeriodFilter();
          }
        }
      ]
    });
    await alert.present();
  }

  // =====================
  // MÉTODOS DE FORMATO Y UTILIDAD
  // =====================

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

  async viewAttendanceDetail(attendance: Attendance) {
    const alert = await this.alertController.create({
      header: `Detalles de ${attendance.tipo}`,
      message: `
        <div style="text-align: left;">
          <strong>📅 Fecha:</strong> ${this.formatDate(attendance.fecha)}<br>
          <strong>🕐 Hora:</strong> ${attendance.hora}<br>
          <strong>📍 Ubicación:</strong> ${this.getLocationStatus(attendance.ubicacionValida)}<br>
          <strong>🌍 Coordenadas:</strong><br>
          &nbsp;&nbsp;• Lat: ${attendance.ubicacion.latitud.toFixed(6)}<br>
          &nbsp;&nbsp;• Lng: ${attendance.ubicacion.longitud.toFixed(6)}<br>
          ${attendance.fotoUrl ? '<strong>📸 Foto:</strong> Capturada<br>' : '<strong>📸 Foto:</strong> No disponible<br>'}
          <strong>✅ Estado:</strong> ${attendance.ubicacionValida ? 'Ubicación válida' : 'Fuera del rango permitido'}
        </div>
      `,
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        },
        {
          text: 'Compartir',
          handler: () => {
            this.shareAttendanceDetails(attendance);
          }
        }
      ]
    });
    await alert.present();
  }

  private async shareAttendanceDetails(attendance: Attendance) {
    const details = `
📋 Registro de Asistencia - ITS Cipolletti

📅 Fecha: ${this.formatDate(attendance.fecha)}
🕐 Hora: ${attendance.hora}
📝 Tipo: ${attendance.tipo === 'entrada' ? 'Entrada' : 'Salida'}
📍 Ubicación: ${this.getLocationStatus(attendance.ubicacionValida)}
🌍 Coordenadas: ${attendance.ubicacion.latitud.toFixed(6)}, ${attendance.ubicacion.longitud.toFixed(6)}
✅ Estado: ${attendance.ubicacionValida ? 'Válido' : 'Fuera de rango'}

👤 Usuario: ${this.currentUser?.nombre} ${this.currentUser?.apellido}
📧 Email: ${this.currentUser?.email}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Registro de Asistencia',
          text: details
        });
      } catch (error) {
        console.log('Error sharing:', error);
        this.copyToClipboard(details);
      }
    } else {
      this.copyToClipboard(details);
    }
  }

  private async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      const toast = await this.toastController.create({
        message: '📋 Detalles copiados al portapapeles',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      const toast = await this.toastController.create({
        message: '❌ Error al copiar detalles',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}