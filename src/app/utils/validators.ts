import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  
  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      const phoneRegex = /^[0-9]{10}$/;
      return phoneRegex.test(value) ? null : { invalidPhone: true };
    };
  }

  static employeeId(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      const employeeIdRegex = /^[A-Z]{2}\d{4}$/;
      return employeeIdRegex.test(value) ? null : { invalidEmployeeId: true };
    };
  }

  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      const hasNumber = /[0-9]/.test(value);
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasSpecial = /[#?!@$%^&*-]/.test(value);
      
      const valid = hasNumber && hasUpper && hasLower && hasSpecial && value.length >= 8;
      
      return valid ? null : { weakPassword: true };
    };
  }
}
