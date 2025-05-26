export interface Attendance {
    id?: string;
    userId: string;
    tipo: 'entrada' | 'salida';
    fecha: Date;
    hora: string;
    ubicacion: {
      latitud: number;
      longitud: number;
    };
    fotoUrl: string;
    ubicacionValida: boolean;
  }