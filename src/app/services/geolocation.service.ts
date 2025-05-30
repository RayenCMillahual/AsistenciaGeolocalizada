// Ubicación: src/app/services/geolocation.service.ts

import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { ValidLocation } from '../models/location.model';
import { from, Observable } from 'rxjs';
import { DatabaseService } from './database.service';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  constructor(
    private databaseService: DatabaseService,
    private platform: Platform
  ) {}

  // Solicitar permisos de geolocalización
  async requestPermissions(): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        // En dispositivos móviles con Capacitor
        await Geolocation.requestPermissions();
        console.log('Permisos de geolocalización de Capacitor solicitados');
      } else {
        // En navegadores web
        console.log('En entorno web, permisos se solicitarán automáticamente');
      }
    } catch (error) {
      console.warn('Error solicitando permisos de geolocalización:', error);
      // No lanzar error, permitir que la app continúe
    }
  }

  // Obtener posición actual
  getCurrentPosition(): Observable<Position> {
    return from(this.getCurrentPositionPromise());
  }

  private async getCurrentPositionPromise(): Promise<Position> {
    try {
      if (this.platform.is('capacitor')) {
        // Usar Capacitor en dispositivos móviles
        console.log('Obteniendo ubicación con Capacitor...');
        return await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000
        });
      } else {
        // Usar Web Geolocation API en navegadores
        console.log('Obteniendo ubicación con Web API...');
        return await this.getWebGeolocation();
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      throw error;
    }
  }

  // Implementación para navegadores web
  private async getWebGeolocation(): Promise<Position> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada por este navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Ubicación obtenida vía Web API:', position.coords);
          
          // Convertir a formato de Capacitor
          const capacitorPosition: Position = {
            timestamp: position.timestamp,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              heading: position.coords.heading
            }
          };
          
          resolve(capacitorPosition);
        },
        (error) => {
          console.error('Error Web Geolocation:', error);
          
          let errorMessage = 'Error desconocido';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permisos de ubicación denegados';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000 // Cache de 1 minuto
        }
      );
    });
  }

  // Comprobar si la ubicación actual está dentro del radio permitido
  async isWithinValidLocation(
    currentLat: number, 
    currentLon: number
  ): Promise<{isValid: boolean, distance: number, location: ValidLocation | null}> {
    try {
      console.log(`Verificando ubicación: ${currentLat}, ${currentLon}`);
      
      const validLocations = await this.databaseService.getLocations();
      
      if (!validLocations || validLocations.length === 0) {
        console.warn('No hay ubicaciones válidas configuradas');
        return { 
          isValid: true, // Permitir por defecto si no hay ubicaciones configuradas
          distance: 0, 
          location: null 
        };
      }
      
      // Encontrar la ubicación válida más cercana
      let closestLocation: ValidLocation = validLocations[0];
      let minDistance = this.getDistanceFromLatLonInMeters(
        currentLat, currentLon,
        closestLocation.latitud, closestLocation.longitud
      );
      
      validLocations.forEach(location => {
        const distance = this.getDistanceFromLatLonInMeters(
          currentLat, currentLon,
          location.latitud, location.longitud
        );
        
        console.log(`Distancia a ${location.nombre}: ${distance.toFixed(2)}m`);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestLocation = location;
        }
      });
      
      // Comprobar si la distancia está dentro del radio permitido
      const isValid = minDistance <= closestLocation.radioPermitido;
      
      console.log(`Ubicación más cercana: ${closestLocation.nombre}`);
      console.log(`Distancia: ${minDistance.toFixed(2)}m, Radio permitido: ${closestLocation.radioPermitido}m`);
      console.log(`¿Es válida?: ${isValid}`);
      
      return {
        isValid,
        distance: Math.round(minDistance * 100) / 100, // Redondear a 2 decimales
        location: closestLocation
      };
    } catch (error) {
      console.error('Error verificando ubicación válida:', error);
      
      // En caso de error, ser permisivo para no bloquear la funcionalidad
      return {
        isValid: true,
        distance: 0,
        location: null
      };
    }
  }
  
  // Fórmula Haversine para calcular la distancia entre dos puntos geográficos
  private getDistanceFromLatLonInMeters(
    lat1: number, lon1: number, 
    lat2: number, lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distancia en km
    return distance * 1000; // Convertir a metros
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Obtener nombre legible de la ubicación más cercana
  async getLocationName(lat: number, lon: number): Promise<string> {
    try {
      const locationInfo = await this.isWithinValidLocation(lat, lon);
      
      if (locationInfo.location) {
        const status = locationInfo.isValid ? 'Dentro' : 'Fuera';
        return `${status} de ${locationInfo.location.nombre} (${locationInfo.distance}m)`;
      }
      
      return `Ubicación desconocida (${lat.toFixed(6)}, ${lon.toFixed(6)})`;
    } catch (error) {
      console.error('Error obteniendo nombre de ubicación:', error);
      return 'Ubicación no disponible';
    }
  }

  // Verificar si los servicios de ubicación están disponibles
  async isLocationAvailable(): Promise<boolean> {
    try {
      if (this.platform.is('capacitor')) {
        // Verificar permisos en Capacitor
        const permissions = await Geolocation.checkPermissions();
        return permissions.location === 'granted';
      } else {
        // Verificar disponibilidad en web
        return 'geolocation' in navigator;
      }
    } catch (error) {
      console.error('Error verificando disponibilidad de ubicación:', error);
      return false;
    }
  }

  // Monitorear cambios de ubicación (para funcionalidades futuras)
  watchPosition(): Observable<Position> {
    return from(this.startWatchingPosition());
  }

  private async startWatchingPosition(): Promise<Position> {
    // Implementación básica - en una app real podrías querer un observable continuo
    return this.getCurrentPositionPromise();
  }

  // Calcular tiempo estimado de viaje (funcionalidad adicional)
  calculateTravelTime(
    fromLat: number, fromLon: number,
    toLat: number, toLon: number,
    speedKmh: number = 5 // Velocidad promedio caminando
  ): number {
    const distanceKm = this.getDistanceFromLatLonInMeters(fromLat, fromLon, toLat, toLon) / 1000;
    const timeHours = distanceKm / speedKmh;
    return Math.ceil(timeHours * 60); // Retornar en minutos, redondeado hacia arriba
  }

  // Método de debug
  async getDebugInfo(): Promise<any> {
    try {
      const isAvailable = await this.isLocationAvailable();
      const validLocations = await this.databaseService.getLocations();
      
      let currentPosition = null;
      try {
        const pos = await this.getCurrentPositionPromise();
        currentPosition = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
      } catch (error) {
        currentPosition = `Error: ${(error as Error).message}`;
      }
      
      return {
        isAvailable,
        platform: this.platform.platforms(),
        validLocationsCount: validLocations.length,
        currentPosition
      };
    } catch (error) {
      return {
        error: (error as Error).message,
        platform: this.platform.platforms()
      };
    }
  }
}