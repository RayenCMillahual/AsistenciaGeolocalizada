// src/app/pages/register/register.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonText,
  IonSpinner,
  AlertController,
  LoadingController
} from '@ionic/angular/standalone';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonText,
    IonSpinner
  ]
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.registerForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.pattern(/^[\+]?[0-9\s\-\(\)]+$/)]],
      employeeId: [''],
      departamento: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Validador personalizado para verificar que las contraseñas coincidan
  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  async onRegister() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      
      const loading = await this.loadingController.create({
        message: 'Creando cuenta...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const formData = this.registerForm.value;
        
        // Crear objeto usuario sin confirmPassword
        const { confirmPassword, ...userData } = formData;
        
        const user = await this.authService.register(userData);
        
        console.log('Registro exitoso:', user);
        await loading.dismiss();
        
        // Mostrar mensaje de éxito
        const alert = await this.alertController.create({
          header: '¡Registro Exitoso!',
          message: 'Tu cuenta ha sido creada exitosamente. Puedes iniciar sesión ahora.',
          buttons: [{
            text: 'Continuar',
            handler: () => {
              this.router.navigate(['/login']);
            }
          }]
        });
        await alert.present();
        
      } catch (error) {
        await loading.dismiss();
        console.error('Error en registro:', error);
        
        const alert = await this.alertController.create({
          header: 'Error de Registro',
          message: (error as Error).message || 'Error al crear la cuenta',
          buttons: ['Aceptar']
        });
        await alert.present();
      } finally {
        this.isLoading = false;
      }
    } else {
      // Mostrar errores de validación
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  // Getters para validaciones
  get nombre() { return this.registerForm.get('nombre'); }
  get apellido() { return this.registerForm.get('apellido'); }
  get email() { return this.registerForm.get('email'); }
  get telefono() { return this.registerForm.get('telefono'); }
  get employeeId() { return this.registerForm.get('employeeId'); }
  get departamento() { return this.registerForm.get('departamento'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
}