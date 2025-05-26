import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { ValidLocation } from '../models/location.model';
import { from, Observable } from 'rxjs';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  constructor(
    private databaseService: DatabaseService
  ) {}

  // Solicitar permisos de geolocalización
  async requestPermissions(): Promise<void> {
    await Geolocation.requestPermissions();
  }

  // Obtener posición actual
  getCurrentPosition(): Observable<Position> {
    return from(Geolocation.getCurrentPosition());
  }

  // Comprobar si la ubicación actual está dentro del radio permitido
  async isWithinValidLocation(
    currentLat: number, 
    currentLon: number
  ): Promise<{isValid: boolean, distance: number, location: ValidLocation}> {
    const validLocations = await this.databaseService.getLocations();
    
    if (!validLocations || validLocations.length === 0) {
      return { isValid: false, distance: 0, location: { id: '0', nombre: '', latitud: 0, longitud: 0, radioPermitido: 0 } };
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
      
      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    });
    
    // Comprobar si la distancia está dentro del radio permitido
    const isValid = minDistance <= closestLocation.radioPermitido;
    
    return {
      isValid,
      distance: minDistance,
      location: closestLocation
    };
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
}