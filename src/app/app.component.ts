import { Component, OnInit } from '@angular/core';
import { Platform, IonicModule } from '@ionic/angular';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();
    
    try {
      await SplashScreen.hide();
      await StatusBar.setBackgroundColor({ color: '#3880ff' });
    } catch (error) {
      console.log('Native plugins not available:', error);
    }
  }

  async ngOnInit() {
    // Verificar si el usuario está autenticado
    const isAuthenticated = await this.authService.isAuthenticated();
    
    if (isAuthenticated) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}