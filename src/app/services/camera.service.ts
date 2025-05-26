import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  constructor() { }

  // Solicitar permisos de cámara
  async requestPermissions(): Promise<void> {
    await Camera.requestPermissions();
  }

  // Tomar una foto
  async takePicture(): Promise<string> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false
      });
      
      if (!image.dataUrl) {
        throw new Error('Failed to capture image: dataUrl is undefined');
      }
      return image.dataUrl;
    } catch (e) {
      console.error('Error al capturar la imagen', e);
      throw e;
    }
  }
}