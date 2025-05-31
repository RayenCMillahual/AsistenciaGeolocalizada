// src/app/shared/header/header.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { 
  AlertController, 
  IonPopover,
  ToastController,
  IonicModule 
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  menuOutline,
  notificationsOutline,
  searchOutline,
  refreshOutline,
  personOutline,
  logOutOutline,
  chevronForwardOutline,
  timeOutline,
  wifiOutline,
  cloudOfflineOutline,
  settingsOutline,
  helpCircleOutline,
  alertCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('userPopover') userPopover!: IonPopover;
  
  // Inputs para configuración básica
  @Input() title: string = 'Sistema de Asistencia';
  @Input() subtitle: string = '';
  @Input() breadcrumb: string[] = [];
  
  // Inputs para mostrar/ocultar elementos
  @Input() showBackButton: boolean = false;
  @Input() showMenuButton: boolean = true;
  @Input() showNotifications: boolean = true;
  @Input() showSearch: boolean = false;
  @Input() showRefresh: boolean = true;
  @Input() showUserMenu: boolean = true;
  @Input() showLogout: boolean = false; // Solo si no hay user menu
  @Input() showProgress: boolean = false;
  @Input() showHeaderInfo: boolean = false;
  
  // Inputs para funcionalidad
  @Input() notificationCount: number = 0;
  @Input() progressValue: number = 0;
  @Input() progressColor: string = 'primary';
  @Input() connectionStatus: boolean = true;
  @Input() isRefreshing: boolean = false; // Agregado para controlar estado de refresh
  
  // Outputs para eventos
  @Output() menuClick = new EventEmitter<void>();
  @Output() notificationsClick = new EventEmitter<void>();
  @Output() searchClick = new EventEmitter<void>();
  @Output() refreshClick = new EventEmitter<void>();
  @Output() profileClick = new EventEmitter<void>();
  @Output() settingsClick = new EventEmitter<void>();
  @Output() helpClick = new EventEmitter<void>();
  
  // Estado interno
  currentUser: User | null = null;
  currentTime: Date = new Date();
  isOnline: boolean = navigator.onLine;
  internalRefreshing: boolean = false; // Estado interno para refresh
  isUserMenuOpen: boolean = false;
  
  // Propiedades derivadas del usuario
  get userName(): string {
    return this.currentUser ? `${this.currentUser.nombre} ${this.currentUser.apellido}` : 'Usuario';
  }
  
  get userEmail(): string {
    return this.currentUser?.email || '';
  }
  
  get userAvatar(): string | null {
    // Por ahora retorna null, pero aquí podrías implementar URLs de avatar
    return null;
  }
  
  // Getter combinado para el estado de refresh
  get isRefreshingState(): boolean {
    return this.isRefreshing || this.internalRefreshing;
  }
  
  private subscriptions: Subscription[] = [];
  private timeInterval?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    // Registrar iconos
    addIcons({
      chevronBackOutline,
      menuOutline,
      notificationsOutline,
      searchOutline,
      refreshOutline,
      personOutline,
      logOutOutline,
      chevronForwardOutline,
      timeOutline,
      wifiOutline,
      cloudOfflineOutline,
      settingsOutline,
      helpCircleOutline,
      alertCircleOutline,
      informationCircleOutline
    });
  }

  ngOnInit() {
    this.setupUserData();
    this.setupTimeUpdates();
    this.setupNetworkMonitoring();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.timeInterval?.unsubscribe();
  }

  private setupUserData() {
    const userSub = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.subscriptions.push(userSub);
  }

  private setupTimeUpdates() {
    // Actualizar tiempo cada minuto
    this.timeInterval = interval(60000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  private setupNetworkMonitoring() {
    // Monitorear estado de red
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showNetworkToast('Conexión restaurada', 'success');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showNetworkToast('Sin conexión a internet', 'warning');
    });
  }

  // =====================
  // MÉTODOS DE NAVEGACIÓN
  // =====================

  onMenuClick() {
    this.menuClick.emit();
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/home']);
    }
  }

  // =====================
  // MÉTODOS DE ACCIONES
  // =====================

  onNotificationsClick() {
    this.notificationsClick.emit();
    // Aquí podrías agregar lógica adicional como marcar notificaciones como leídas
  }

  onSearchClick() {
    this.searchClick.emit();
  }

  async onRefreshClick() {
    if (this.isRefreshingState) return;
    
    this.internalRefreshing = true;
    this.refreshClick.emit();
    
    // Simular tiempo mínimo de refresh para UX
    setTimeout(() => {
      this.internalRefreshing = false;
    }, 1000);
  }

  onUserMenuClick(event: Event) {
    this.isUserMenuOpen = true;
    this.userPopover.event = event;
  }

  // =====================
  // MÉTODOS DEL MENÚ DE USUARIO
  // =====================

  onProfileClick() {
    this.isUserMenuOpen = false;
    this.profileClick.emit();
    
    // Navegación por defecto si no se maneja externamente
    setTimeout(() => {
      this.router.navigate(['/profile']);
    }, 100);
  }

  onSettingsClick() {
    this.isUserMenuOpen = false;
    this.settingsClick.emit();
    
    // Navegación por defecto si no se maneja externamente
    setTimeout(() => {
      this.router.navigate(['/settings']);
    }, 100);
  }

  onHelpClick() {
    this.isUserMenuOpen = false;
    this.helpClick.emit();
    
    // Acción por defecto: mostrar información de ayuda
    setTimeout(() => {
      this.showHelpDialog();
    }, 100);
  }

  // =====================
  // MÉTODOS DE LOGOUT
  // =====================

  async logout() {
    this.isUserMenuOpen = false;
    
    const alert = await this.alertController.create({
      header: '¿Cerrar Sesión?',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Cerrar Sesión',
          cssClass: 'danger',
          handler: async () => {
            await this.performLogout();
          }
        }
      ]
    });

    await alert.present();
  }

  private async performLogout() {
    try {
      // Mostrar loading
      const toast = await this.toastController.create({
        message: 'Cerrando sesión...',
        duration: 2000,
        color: 'primary',
        position: 'top'
      });
      await toast.present();

      // Ejecutar logout
      await this.authService.logout();
      
      // Redirigir a login
      this.router.navigate(['/login'], { replaceUrl: true });
      
      // Mostrar confirmación
      const successToast = await this.toastController.create({
        message: '✅ Sesión cerrada exitosamente',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await successToast.present();
      
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      
      const errorToast = await this.toastController.create({
        message: '❌ Error al cerrar sesión',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await errorToast.present();
    }
  }

  // =====================
  // MÉTODOS DE UTILIDAD
  // =====================

  private async showNetworkToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
      translucent: true
    });
    await toast.present();
  }

  private async showHelpDialog() {
    const alert = await this.alertController.create({
      header: 'Centro de Ayuda',
      message: `
        <strong>Sistema de Asistencia ITS Cipolletti</strong><br><br>
        
        <strong>Funciones principales:</strong><br>
        • Registrar entrada y salida<br>
        • Ver historial de asistencias<br>
        • Consultar estadísticas<br><br>
        
        <strong>¿Necesitas más ayuda?</strong><br>
        Contacta al administrador del sistema.
      `,
      buttons: [
        {
          text: 'Entendido',
          role: 'cancel'
        },
        {
          text: 'Contactar Soporte',
          handler: () => {
            this.contactSupport();
          }
        }
      ]
    });
    await alert.present();
  }

  private contactSupport() {
    // Aquí podrías implementar diferentes formas de contacto
    const supportEmail = 'soporte@itscipolletti.edu.ar';
    const subject = 'Consulta sobre Sistema de Asistencias';
    const body = `Hola, necesito ayuda con el sistema de asistencias.\n\nUsuario: ${this.userEmail}\nFecha: ${new Date().toLocaleString()}`;
    
    const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  }

  // =====================
  // MÉTODOS PÚBLICOS PARA CONTROL EXTERNO
  // =====================

  /**
   * Actualizar el título del header desde el componente padre
   */
  updateTitle(title: string, subtitle?: string) {
    this.title = title;
    if (subtitle) {
      this.subtitle = subtitle;
    }
  }

  /**
   * Actualizar el breadcrumb desde el componente padre
   */
  updateBreadcrumb(breadcrumb: string[]) {
    this.breadcrumb = breadcrumb;
  }

  /**
   * Mostrar/ocultar barra de progreso
   */
  setProgress(show: boolean, value?: number, color?: string) {
    this.showProgress = show;
    if (value !== undefined) {
      this.progressValue = value;
    }
    if (color) {
      this.progressColor = color;
    }
  }

  /**
   * Actualizar contador de notificaciones
   */
  updateNotificationCount(count: number) {
    this.notificationCount = count;
  }

  /**
   * Forzar actualización de datos de usuario
   */
  async refreshUserData() {
    try {
      await this.authService.refreshUserData();
    } catch (error) {
      console.error('Error actualizando datos de usuario:', error);
    }
  }

  /**
   * Simular acción de refresh (útil para testing)
   */
  triggerRefresh() {
    this.onRefreshClick();
  }

  // =====================
  // GETTERS PARA ESTADO
  // =====================

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get currentRoute(): string {
    return this.router.url;
  }

  get headerState() {
    return {
      title: this.title,
      subtitle: this.subtitle,
      user: this.currentUser,
      isOnline: this.isOnline,
      isRefreshing: this.isRefreshingState,
      notificationCount: this.notificationCount
    };
  }

  // =====================
  // MÉTODOS DE DEBUG (para desarrollo)
  // =====================

  getDebugInfo() {
    return {
      component: 'HeaderComponent',
      title: this.title,
      subtitle: this.subtitle,
      breadcrumb: this.breadcrumb,
      currentUser: this.currentUser?.email || 'No user',
      isOnline: this.isOnline,
      isRefreshing: this.isRefreshing,
      showElements: {
        backButton: this.showBackButton,
        menuButton: this.showMenuButton,
        notifications: this.showNotifications,
        search: this.showSearch,
        refresh: this.showRefresh,
        userMenu: this.showUserMenu,
        logout: this.showLogout,
        progress: this.showProgress,
        headerInfo: this.showHeaderInfo
      },
      state: {
        isRefreshing: this.isRefreshingState,
        isOnline: this.isOnline
      }
    };
  }
}