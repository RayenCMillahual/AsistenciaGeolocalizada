export interface User {
    id?: string;
    email: string;
    password?: string;
    nombre: string;
    apellido: string;
    fechaCreacion?: Date;
    telefono?: string;
  }