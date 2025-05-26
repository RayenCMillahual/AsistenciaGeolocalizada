import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input() title: string = 'Asistencia';
  @Input() showBackButton: boolean = false;
  @Input() showMenuButton: boolean = true;
  @Output() menuClick = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) {}

  onMenuClick() {
    this.menuClick.emit();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          handler: async () => {
            await this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  goBack() {
    window.history.back();
  }
}