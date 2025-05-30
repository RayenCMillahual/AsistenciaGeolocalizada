// src/app/models/user.model.ts
export interface User {
  id?: string;
  email: string;
  password?: string; // Solo para registro, no se almacena
  nombre: string;
  apellido: string;
  telefono?: string;
  employeeId?: string;
  
  // Cambio de departamento por materia y carrera
  carrera?: string; // Nueva propiedad para la carrera
  materia?: string; // Reemplaza departamento
  
  fechaCreacion?: Date;
  activo?: boolean;
  uid?: string;
}

// Enums para las opciones de carreras y materias
export enum Carrera {
  DESARROLLO_FULLSTACK = 'Tecnicatura Superior en Desarrollo de Software Full Stack',
  DEVOPS = 'Tecnicatura Superior en DevOps',
  INFORMATICA = 'Tecnicatura Superior en Informática'
}

export const MATERIAS_POR_CARRERA = {
  [Carrera.DESARROLLO_FULLSTACK]: [
    'Inglés Técnico I',
    'Matemática',
    'Laboratorio Full Stack I',
    'Arquitectura de las Computadoras',
    'Programación',
    'Base de Datos',
    'Diseño UX/UI',
    'Práctica Profesionalizante',
    'Inglés Técnico II',
    'Laboratorio Full Stack II',
    'Integración de Aplicaciones',
    'Programación Backend',
    'Desarrollo de Software',
    'Programación Frontend',
    'Inglés Técnico III',
    'Ética y Responsabilidad Social',
    'Innovación y Desarrollo Emprendedor',
    'Desarrollo Web',
    'Desarrollo Móvil',
    'Gestión de Proyectos de Software',
    'Práctica Profesionalizante'
  ],
  
  [Carrera.DEVOPS]: [
    'Inglés I',
    'Cultura DevOps y Adopción',
    'Metodologías Ágiles',
    'Control de Versiones',
    'Aplicaciones Cloud Nativas',
    'Sistemas Operativos',
    'Automatización y Scripting',
    'Laboratorio I',
    'Inglés II',
    'Bases de Datos como Servicio',
    'Refactoring y Testing',
    'Calidad, Pruebas y Automatización',
    'Laboratorio II',
    'Redes Virtuales',
    'Integración y Entrega Continua',
    'Inglés III',
    'Seguridad Informática',
    'Observabilidad',
    'Operaciones y Escalamiento',
    'Laboratorio III',
    'Práctica Profesionalizante I',
    'Práctica Profesionalizante II',
    'Práctica Profesionalizante III'
  ],
  
  [Carrera.INFORMATICA]: [
    'Inglés Técnico I',
    'Tecnología, Ciencia y Sociedad',
    'Arquitectura de las Computadoras',
    'Matemática I',
    'Laboratorio de Informática I',
    'Sistemas y Organizaciones',
    'Introducción a la Programación',
    'Práctica Profesionalizante I',
    'Inglés Técnico II',
    'Matemática II',
    'Mantenimiento de Infraestructura',
    'Análisis y Diseño de Sistemas',
    'Base de Datos',
    'Legislación',
    'Redes de Datos',
    'Laboratorio de Informática II',
    'Práctica Profesionalizante II',
    'Ética Profesional',
    'Inglés Técnico III',
    'Sistemas Operativos',
    'Investigación Operativa',
    'Auditoría de Sistemas',
    'Seguridad e Integridad de Sistemas y Redes',
    'Diagnóstico y Solución de Incidentes',
    'Laboratorio de Informática III',
    'Práctica Profesionalizante III'
  ]
};

// Función helper para obtener materias por carrera
export function getMateriasByCarrera(carrera: string): string[] {
  return MATERIAS_POR_CARRERA[carrera as Carrera] || [];
}

// Función helper para obtener todas las carreras
export function getAllCarreras(): string[] {
  return Object.values(Carrera);
}

// Función helper para obtener todas las materias (todas las carreras)
export function getAllMaterias(): string[] {
  const todasLasMaterias = new Set<string>();
  
  Object.values(MATERIAS_POR_CARRERA).forEach(materias => {
    materias.forEach(materia => todasLasMaterias.add(materia));
  });
  
  return Array.from(todasLasMaterias).sort();
}