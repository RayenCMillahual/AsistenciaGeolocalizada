// src/app/pages/home/home.page.ts - FASE 2: Con AttendanceService
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonText,
  IonAvatar,
  IonBadge,
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
  personOutline,
  calendarOutline,
  chevronForward,
  logInOutline,
  logOutOutline as logOutIcon,
  checkmarkCircleOutline,
  alertCircleOutline,
  refreshOutline,
  locationOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { User } from '../../models/user.model';
import { Attendance } from '../../models/attendance.model';

@Component({
  selector: 'app-home',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar color="primary">
        <ion-title>Sistema de Asistencia - ITS Cipolletti</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refreshData()" fill="clear">
            <ion-icon name="refresh-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="logout()" fill="clear">
            <ion-icon name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="home-content">
      <!-- Refresher -->
      <ion-refresher slot="fixed" (ionRefresh)="refreshData($event)">
        <ion-refresher-content
          pullingIcon="refresh-outline"
          pullingText="Desliza para actualizar"
          refreshingSpinner="crescent"
          refreshingText="Actualizando...">
        </ion-refresher-content>
      </ion-refresher>

      <div class="home-container">
        
        <!-- Header de Bienvenida -->
        <div class="welcome-section">
          <div class="welcome-background">
            <!-- Información del usuario -->
            <div class="user-info">
              <div class="avatar-container">
                <ion-avatar class="user-avatar">
                  <ion-icon name="person-outline" class="avatar-icon"></ion-icon>
                </ion-avatar>
                <div class="status-indicator" [class.online]="canCheckIn || canCheckOut"></div>
              </div>
              
              <div class="user-details">
                <h1 class="greeting">{{ getGreeting() }}</h1>
                <h2 class="user-name" *ngIf="currentUser">
                  {{ currentUser.nombre }} {{ currentUser.apellido }}
                </h2>
                <h2 class="user-name" *ngIf="!currentUser">
                  Cargando usuario...
                </h2>
                
                <div class="employee-info" *ngIf="currentUser?.materia">
                  <ion-icon name="calendarOutline"></ion-icon>
                  <span>{{ currentUser?.materia }}</span>
                </div>
              </div>
            </div>

            <!-- Reloj digital -->
            <div class="clock-section">
              <div class="digital-clock">
                <div class="time-display">
                  <span class="time">{{ currentTimeString }}</span>
                  <span class="seconds">{{ currentSecondsString }}</span>
                </div>
                <div class="date-display">
                  <ion-icon name="calendar-outline"></ion-icon>
                  <span>{{ currentDateString }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Estado de Asistencias de Hoy -->
        <div class="status-section">
          <div class="status-card" *ngIf="todayAttendances.entrada || todayAttendances.salida; else noAttendanceCard">
            <div class="status-header">
              <h3>
                <ion-icon name="time-outline"></ion-icon>
                Registro del Día
              </h3>
              <ion-badge [color]="getAttendanceStatusColor()" class="status-badge">
                {{getAttendanceStatusColor() }}
              </ion-badge>
            </div>
            
            <div class="status-content">
              <div class="attendance-timeline">
                <!-- Entrada -->
                <div class="timeline-item entrada" [class.completed]="todayAttendances.entrada">
                  <div class="timeline-marker entrada" [class.completed]="todayAttendances.entrada">
                    <ion-icon name="log-in-outline"></ion-icon>
                  </div>
                  <div class="timeline-content">
                    <h4>Entrada</h4>
                    <p *ngIf="todayAttendances.entrada; else pendingEntrada">
                      {{ todayAttendances.entrada.hora }}
                      <span class="location-status" [class.valid]="todayAttendances.entrada.ubicacionValida">
                        <ion-icon [name]="todayAttendances.entrada.ubicacionValida ? 'checkmark-circle-outline' : 'alert-circle-outline'"></ion-icon>
                      </span>
                    </p>
                    <ng-template #pendingEntrada>
                      <p class="pending">Pendiente de registro</p>
                    </ng-template>
                  </div>
                </div>

                <!-- Conector visual -->
                <div class="timeline-connector" [class.active]="todayAttendances.entrada"></div>

                <!-- Salida -->
                <div class="timeline-item salida" [class.completed]="todayAttendances.salida">
                  <div class="timeline-marker salida" [class.completed]="todayAttendances.salida">
                    <ion-icon name="log-out-outline"></ion-icon>
                  </div>
                  <div class="timeline-content">
                    <h4>Salida</h4>
                    <p *ngIf="todayAttendances.salida; else pendingSalida">
                      {{ todayAttendances.salida.hora }}
                      <span class="location-status" [class.valid]="todayAttendances.salida.ubicacionValida">
                        <ion-icon [name]="todayAttendances.salida.ubicacionValida ? 'checkmark-circle-outline' : 'alert-circle-outline'"></ion-icon>
                      </span>
                    </p>
                    <ng-template #pendingSalida>
                      <p class="pending">Pendiente de registro</p>
                    </ng-template>
                  </div>
                </div>
              </div>

              <!-- Horas trabajadas -->
              <div class="working-hours" *ngIf="todayAttendances.entrada && todayAttendances.salida">
                <ion-icon name="time-outline"></ion-icon>
                <span>Horas trabajadas: {{ calculateWorkingHours() }}</span>
              </div>
            </div>
          </div>

          <!-- Tarjeta cuando no hay registros -->
          <ng-template #noAttendanceCard>
            <div class="no-attendance-card">
              <div class="no-attendance-content">
                <ion-icon name="calendar-outline" class="no-attendance-icon"></ion-icon>
                <h3>Sin registros hoy</h3>
                <p>Comienza registrando tu entrada al ITS</p>
              </div>
            </div>
          </ng-template>
        </div>

        <!-- Botones de Acción -->
        <div class="action-section">
          <!-- Registrar Entrada -->
          <div class="action-card entrada" [class.disabled]="!canCheckIn || isLoading" (click)="canCheckIn && !isLoading && registerEntry()">
            <div class="action-content">
              <div class="action-icon-container entrada">
                <ion-spinner *ngIf="isLoading && actionType === 'entrada'" name="crescent"></ion-spinner>
                <ion-icon *ngIf="!isLoading || actionType !== 'entrada'" name="log-in-outline" class="action-icon"></ion-icon>
              </div>
              <div class="action-details">
                <h3>Registrar Entrada</h3>
                <p *ngIf="canCheckIn && !isLoading">Toca para marcar tu llegada al ITS</p>
                <p *ngIf="!canCheckIn" class="disabled-text">Ya registraste tu entrada hoy</p>
                <p *ngIf="isLoading && actionType === 'entrada'" class="loading-text">Registrando entrada...</p>
              </div>
              <div class="action-status">
                <ion-icon 
                  [name]="canCheckIn ? 'chevron-forward' : 'checkmark-circle-outline'" 
                  [color]="canCheckIn ? 'medium' : 'success'">
                </ion-icon>
              </div>
            </div>
          </div>

          <!-- Registrar Salida -->
          <div class="action-card salida" [class.disabled]="!canCheckOut || isLoading" (click)="canCheckOut && !isLoading && registerExit()">
            <div class="action-content">
              <div class="action-icon-container salida">
                <ion-spinner *ngIf="isLoading && actionType === 'salida'" name="crescent"></ion-spinner>
                <ion-icon *ngIf="!isLoading || actionType !== 'salida'" name="log-out-outline" class="action-icon"></ion-icon>
              </div>
              <div class="action-details">
                <h3>Registrar Salida</h3>
                <p *ngIf="canCheckOut && !isLoading">Toca para marcar tu salida del ITS</p>
                <p *ngIf="!canCheckOut && !todayAttendances.entrada" class="disabled-text">Primero registra tu entrada</p>
                <p *ngIf="!canCheckOut && todayAttendances.entrada && todayAttendances.salida" class="disabled-text">Ya registraste tu salida hoy</p>
                <p *ngIf="isLoading && actionType === 'salida'" class="loading-text">Registrando salida...</p>
              </div>
              <div class="action-status">
                <ion-icon 
                  [name]="canCheckOut ? 'chevron-forward' : (todayAttendances.salida ? 'checkmark-circle-outline' : 'location-outline')" 
                  [color]="canCheckOut ? 'medium' : (todayAttendances.salida ? 'success' : 'medium')">
                </ion-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Información del Usuario -->
        <div class="user-section" *ngIf="currentUser">
          <h3 class="section-title">
            <ion-icon name="person-outline"></ion-icon>
            Mi Información
          </h3>
          
          <ion-card>
            <ion-card-content>
              <div class="info-grid">
                <div class="info-item" *ngIf="currentUser.email">
                  <strong>Email:</strong> {{ currentUser.email }}
                </div>
                
                <div class="info-item" *ngIf="currentUser.carrera">
                  <strong>Carrera:</strong> {{ currentUser.carrera }}
                </div>
                
                <div class="info-item" *ngIf="currentUser.materia">
                  <strong>Materia:</strong> {{ currentUser.materia }}
                </div>
                
                <div class="info-item" *ngIf="currentUser.employeeId">
                  <strong>ID Empleado:</strong> {{ currentUser.employeeId }}
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Debug Info -->
        <div class="debug-section">
          <ion-card>
            <ion-card-content>
              <h4>🔧 Debug Info - Fase 2</h4>
              <div class="debug-info">
                <p><strong>Usuario autenticado:</strong> {{ !!currentUser ? 'Sí' : 'No' }}</p>
                <p><strong>Puede registrar entrada:</strong> {{ canCheckIn ? 'Sí' : 'No' }}</p>
                <p><strong>Puede registrar salida:</strong> {{ canCheckOut ? 'Sí' : 'No' }}</p>
                <p><strong>Entrada registrada:</strong> {{ !!todayAttendances.entrada ? 'Sí' : 'No' }}</p>
                <p><strong>Salida registrada:</strong> {{ !!todayAttendances.salida ? 'Sí' : 'No' }}</p>
                <p><strong>Cargando:</strong> {{ isLoading ? 'Sí' : 'No' }}</p>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .home-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .home-container {
      padding: 0;
      min-height: 100vh;
    }
    
    .welcome-section {
      .welcome-background {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px 20px 30px;
        color: white;
        position: relative;
        
        .user-info {
          display: flex;
          align-items: center;
          margin-bottom: 30px;
          
          .avatar-container {
            position: relative;
            margin-right: 20px;
            
            .user-avatar {
              width: 80px;
              height: 80px;
              background: rgba(255, 255, 255, 0.2);
              border: 3px solid rgba(255, 255, 255, 0.3);
              
              .avatar-icon {
                font-size: 40px;
                color: white;
              }
            }
            
            .status-indicator {
              position: absolute;
              bottom: 5px;
              right: 5px;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              border: 3px solid white;
              background: #ff4757;
              
              &.online {
                background: #2ed573;
              }
            }
          }
          
          .user-details {
            flex: 1;
            
            .greeting {
              font-size: 28px;
              font-weight: 300;
              margin: 0 0 8px 0;
            }
            
            .user-name {
              font-size: 20px;
              font-weight: 600;
              margin: 0 0 8px 0;
            }
            
            .employee-info {
              display: flex;
              align-items: center;
              font-size: 14px;
              background: rgba(255, 255, 255, 0.2);
              padding: 6px 12px;
              border-radius: 20px;
              display: inline-flex;
              
              ion-icon {
                margin-right: 6px;
              }
            }
          }
        }
        
        .clock-section {
          text-align: center;
          
          .digital-clock {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 24px;
            backdrop-filter: blur(20px);
            
            .time-display {
              display: flex;
              align-items: baseline;
              justify-content: center;
              margin-bottom: 12px;
              
              .time {
                font-size: 48px;
                font-weight: 200;
                font-family: 'Roboto Mono', monospace;
              }
              
              .seconds {
                font-size: 24px;
                font-weight: 300;
                margin-left: 8px;
                opacity: 0.8;
              }
            }
            
            .date-display {
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              opacity: 0.9;
              
              ion-icon {
                margin-right: 8px;
              }
            }
          }
        }
      }
    }
    
    .status-section {
      padding: 20px;
      margin-top: -20px;
      position: relative;
      z-index: 2;
      
      .status-card {
        margin: 0;
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        background: white;
        padding: 20px;
        
        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          
          h3 {
            display: flex;
            align-items: center;
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            
            ion-icon {
              margin-right: 10px;
              color: var(--ion-color-primary);
            }
          }
          
          .status-badge {
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
        }
        
        .attendance-timeline {
          position: relative;
          
          .timeline-item {
            display: flex;
            align-items: center;
            margin-bottom: 24px;
            
            .timeline-marker {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 20px;
              border: 3px solid #e0e0e0;
              background: white;
              
              &.entrada ion-icon {
                color: #2ed573;
                font-size: 24px;
              }
              
              &.salida ion-icon {
                color: #ff6b6b;
                font-size: 24px;
              }
              
              &.completed {
                border-color: currentColor;
                box-shadow: 0 0 0 4px rgba(46, 213, 115, 0.2);
              }
            }
            
            .timeline-content {
              flex: 1;
              
              h4 {
                font-size: 16px;
                font-weight: 600;
                margin: 0 0 4px 0;
              }
              
              p {
                display: flex;
                align-items: center;
                font-size: 14px;
                margin: 0;
                
                &.pending {
                  color: var(--ion-color-medium);
                  font-style: italic;
                }
                
                .location-status {
                  margin-left: 8px;
                  
                  &.valid ion-icon {
                    color: #2ed573;
                  }
                  
                  &:not(.valid) ion-icon {
                    color: #ff6b6b;
                  }
                }
              }
            }
          }
          
          .timeline-connector {
            position: absolute;
            left: 24px;
            top: 50px;
            width: 2px;
            height: 24px;
            background: #e0e0e0;
            
            &.active {
              background: linear-gradient(to bottom, #2ed573, #ff6b6b);
            }
          }
        }
        
        .working-hours {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 16px;
          border-radius: 16px;
          margin-top: 20px;
          
          ion-icon {
            font-size: 20px;
            margin-right: 10px;
          }
        }
      }
      
      .no-attendance-card {
        margin: 0;
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        background: white;
        
        .no-attendance-content {
          text-align: center;
          padding: 40px 20px;
          
          .no-attendance-icon {
            font-size: 64px;
            color: var(--ion-color-medium);
            margin-bottom: 16px;
          }
          
          h3 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
          }
        }
      }
    }
    
    .action-section {
      padding: 0 20px 20px;
      
      .action-card {
        margin: 0 0 16px 0;
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        overflow: hidden;
        position: relative;
        background: white;
        
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          transition: all 0.3s ease;
        }
        
        &.entrada::before {
          background: linear-gradient(90deg, #2ed573, #1dd1a1);
        }
        
        &.salida::before {
          background: linear-gradient(90deg, #ff6b6b, #ee5a52);
        }
        
        &:not(.disabled):hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }
        
        &.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .action-content {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          
          .action-icon-container {
            width: 60px;
            height: 60px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 20px;
            
            &.entrada {
              background: rgba(46, 213, 115, 0.1);
              
              .action-icon {
                color: #2ed573;
                font-size: 28px;
              }
              
              ion-spinner {
                --color: #2ed573;
              }
            }
            
            &.salida {
              background: rgba(255, 107, 107, 0.1);
              
              .action-icon {
                color: #ff6b6b;
                font-size: 28px;
              }
              
              ion-spinner {
                --color: #ff6b6b;
              }
            }
          }
          
          .action-details {
            flex: 1;
            
            h3 {
              font-size: 18px;
              font-weight: 700;
              margin: 0 0 4px 0;
            }
            
            p {
              font-size: 14px;
              color: var(--ion-color-medium);
              margin: 0;
              
              &.loading-text {
                color: var(--ion-color-primary);
                font-weight: 500;
              }
            }
          }
          
          .action-status {
            ion-icon {
              font-size: 24px;
            }
          }
        }
      }
    }
    
    .user-section, 
    .debug-section {
      padding: 20px;
      
      .section-title {
        display: flex;
        align-items: center;
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 16px;
        
        ion-icon {
          margin-right: 12px;
          color: var(--ion-color-primary);
        }
      }
    }
    
    .info-grid {
      .info-item {
        margin-bottom: 12px;
        padding: 8px 0;
        border-bottom: 1px solid var(--ion-color-light);
        
        &:last-child {
          border-bottom: none;
        }
      }
    }
    
    .debug-section {
      .debug-info p {
        margin: 8px 0;
        font-size: 14px;
      }
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonText,
    IonAvatar,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent
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
      logOutOutline,
      timeOutline,
      personOutline,
      calendarOutline,
      chevronForward,
      logInOutline,
      logOutIcon,
      checkmarkCircleOutline,
      alertCircleOutline,
      refreshOutline,
      locationOutline
    });
    
    console.log('🏠 HomePage - Fase 2 inicializada');
  }

  ngOnInit() {
    console.log('🏠 HomePage ngOnInit - Cargando datos...');
    this.loadUserData();
    this.loadTodayAttendances();
    this.startTimeUpdates();
  }

  ngOnDestroy() {
    console.log('🏠 HomePage ngOnDestroy - Limpiando subscripciones...');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.timeSubscription?.unsubscribe();
  }

  private loadUserData() {
    const userSub = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      console.log('👤 Usuario cargado en HomePage:', user?.email || 'No user');
    });
    this.subscriptions.push(userSub);
  }

  private loadTodayAttendances() {
    const attendanceSub = this.attendanceService.getTodayAttendances().subscribe(
      attendances => {
        this.todayAttendances = attendances;
        console.log('📋 Asistencias de hoy actualizadas:', attendances);
      }
    );
    this.subscriptions.push(attendanceSub);
  }

  private startTimeUpdates() {
    this.updateTime();
    
    // Actualizar cada segundo
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
      console.log(`🎯 Iniciando registro de ${tipo}`);
      
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

      console.log(`✅ ${tipo} registrada:`, attendance);

    } catch (error) {
      await loading.dismiss();
      console.error(`❌ Error registrando ${tipo}:`, error);

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
      console.log('🔄 Actualizando datos...');
      
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
      
      console.error('❌ Error actualizando datos:', error);
      
      const toast = await this.toastController.create({
        message: '❌ Error al actualizar datos',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
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
              
              const toast = await this.toastController.create({
                message: '✅ Sesión cerrada exitosamente',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getSubscriptionsCount(): number {
    return this.subscriptions.length;
  }
}