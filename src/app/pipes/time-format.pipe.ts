import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeFormat',
  standalone: true
})
export class TimeFormatPipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return '';
    
    // Si el valor ya es una hora formateada (HH:MM), devolverla tal como está
    if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
      return value;
    }
    
    // Si es una fecha, extraer la hora
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      return value.toString();
    }
    
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}