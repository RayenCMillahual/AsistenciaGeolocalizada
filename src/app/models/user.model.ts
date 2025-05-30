// src/app/models/user.model.ts
export interface User {
  id?: string;
  email: string;
  password?: string; // Solo para registro, no se almacena
  nombre: string;
  apellido: string;
  telefono?: string;
  employeeId?: string;
  departamento?: string; 
  fechaCreacion?: Date;
  activo?: boolean;
  uid?: string;
}