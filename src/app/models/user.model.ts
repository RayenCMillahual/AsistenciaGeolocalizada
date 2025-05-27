export interface User {
  id?: string;
  email: string;
  password?: string;
  nombre: string;     
  apellido: string;    
  employeeId?: string; 
  fechaCreacion?: Date;
  telefono?: string;
}