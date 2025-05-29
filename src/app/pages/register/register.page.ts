// Ubicación: app/pages/register/register.page.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonicModule,
  LoadingController, 
  AlertController, 
  ToastController 
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    IonicModule
  ]
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    this.registerForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{8,15}$/)]],
      employeeId: ['', [Validators.required]],
      department: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {}

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    // Limpiar errores si las contraseñas coinciden
    if (confirmPassword && confirmPassword.errors?.['passwordMismatch'] && password?.value === confirmPassword.value) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Registrando usuario...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const formData = this.registerForm.value;
        
        // Crear objeto User con la estructura correcta
        const userData = {
          email: formData.email,
          password: formData.password,
          nombre: formData.firstName,
          apellido: formData.lastName,
          telefono: formData.phone,
          employeeId: formData.employeeId,
          departamento: formData.department // Agregar el departamento
        };
        
        const user = await this.authService.register(userData);
        
        if (user) {
          await loading.dismiss();
          this.showToast('Usuario registrado exitosamente', 'success');
          
          // Limpiar el formulario
          this.registerForm.reset();
          
          // Navegar al login
          this.router.navigate(['/login']);
        }
      } catch (error: any) {
        await loading.dismiss();
        
        let errorMessage = 'Error al registrar usuario';
        
        // Manejar errores específicos de Firebase
        if (error.message) {
          errorMessage = error.message;
        }
        
        this.showAlert('Error de Registro', errorMessage);
        console.error('Registration error:', error);
      }
    } else {
      // Mostrar errores de validación
      this.markFormGroupTouched(this.registerForm);
      this.showToast('Por favor, completa todos los campos correctamente', 'warning');
    }
  }

  // Marcar todos los campos como tocados para mostrar errores
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // Obtener mensaje de error para un campo específico
  getFieldErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `Este campo es requerido`;
      }
      if (field.errors['email']) {
        return 'Ingresa un correo válido';
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['pattern']) {
        if (fieldName === 'phone') {
          return 'Ingresa un número válido (8-15 dígitos)';
        }
      }
      if (field.errors['passwordMismatch']) {
        return 'Las contraseñas no coinciden';
      }
    }
    
    return '';
  }

  // Verificar si un campo tiene errores para mostrar estilos
  hasFieldError(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  togglePassword(field: string) {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
      buttons: [
        {
          text: 'X',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}