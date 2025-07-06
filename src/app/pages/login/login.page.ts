// src/app/pages/login/login.page.ts - ACTUALIZADO CON NUEVO HEADER
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  AlertController,
  LoadingController
} from '@ionic/angular/standalone';

import { AuthService } from '../../services/auth.service';
// Importar el nuevo header
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
    HeaderComponent // Importar el header component
  ]
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onLogin() {
  if (this.loginForm.valid) {
    this.isLoading = true;
    
    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { email, password } = this.loginForm.value;
      console.log('🔐 LoginPage: Intentando login con:', email);
      
      const user = await this.authService.login(email, password);
      console.log('✅ LoginPage: Login exitoso:', user);
      
      await loading.dismiss();
      
      // SOLUCIÓN: Esperar a que el estado se actualice antes de navegar
      console.log('⏳ LoginPage: Esperando actualización de estado...');
      
      // Esperar un momento para que BehaviorSubject se actualice
      setTimeout(async () => {
        console.log('🏠 LoginPage: Navegando a home...');
        
        try {
          const success = await this.router.navigate(['/home'], { replaceUrl: true });
          console.log('🏠 LoginPage: Navegación resultado:', success);
          
          if (!success) {
            console.log('❌ LoginPage: Navegación falló, usando window.location');
            window.location.href = '/home';
          }
        } catch (navError) {
          console.error('❌ LoginPage: Error navegando:', navError);
          window.location.href = '/home';
        }
      }, 1500); // Esperar 1.5 segundos
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ LoginPage: Error en login:', error);
      
      const alert = await this.alertController.create({
        header: 'Error de Autenticación',
        message: (error as Error).message || 'Error al iniciar sesión',
        buttons: ['Aceptar']
      });
      await alert.present();
    } finally {
      this.isLoading = false;
    }
  } else {
    console.log('❌ LoginPage: Formulario inválido');
    this.markFormGroupTouched();
  }
}
  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  // Getters para validaciones
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}