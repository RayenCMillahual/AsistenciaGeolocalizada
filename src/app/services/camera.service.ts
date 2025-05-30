// Ubicación: src/app/services/camera.service.ts

import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  constructor(private platform: Platform) {}

  // Solicitar permisos de cámara
  async requestPermissions(): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        console.log('Solicitando permisos de cámara (Capacitor)...');
        await Camera.requestPermissions();
      } else {
        console.log('En entorno web, permisos de cámara se solicitarán al usar');
      }
    } catch (error) {
      console.warn('Error solicitando permisos de cámara:', error);
      // No lanzar error para no bloquear la app
    }
  }

  // Tomar una foto
  async takePicture(): Promise<string> {
    try {
      console.log('Iniciando captura de foto...');
      
      if (this.platform.is('capacitor')) {
        // Usar Capacitor Camera en dispositivos móviles
        return await this.takeCapacitorPhoto();
      } else {
        // Usar Web Camera API en navegadores
        return await this.takeWebPhoto();
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      throw error;
    }
  }

  // Implementación para Capacitor (móviles)
  private async takeCapacitorPhoto(): Promise<string> {
    try {
      console.log('Tomando foto con Capacitor Camera...');
      
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 800,
        height: 600
      });
      
      if (!image.dataUrl) {
        throw new Error('No se pudo capturar la imagen');
      }
      
      console.log('Foto capturada exitosamente con Capacitor');
      return image.dataUrl;
    } catch (error) {
      console.error('Error con Capacitor Camera:', error);
      throw new Error('Error al acceder a la cámara del dispositivo');
    }
  }

  // Implementación para Web (navegadores)
  private async takeWebPhoto(): Promise<string> {
    try {
      console.log('Tomando foto con Web Camera API...');
      
      // Verificar soporte del navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no está soportada en este navegador');
      }

      // Solicitar acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 800 },
          height: { ideal: 600 },
          facingMode: 'environment' // Preferir cámara trasera
        }
      });

      console.log('Acceso a cámara web obtenido');

      // Crear elementos para captura
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('No se pudo crear contexto de canvas');
      }

      return new Promise((resolve, reject) => {
        // Configurar video
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
          try {
            // Configurar canvas con las dimensiones del video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Esperar un momento para que el video se estabilice
            setTimeout(() => {
              try {
                // Capturar frame actual del video
                ctx.drawImage(video, 0, 0);

                // Detener el stream
                stream.getTracks().forEach(track => track.stop());

                // Convertir a base64
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                console.log('Foto capturada exitosamente con Web API');
                resolve(dataUrl);
              } catch (captureError) {
                stream.getTracks().forEach(track => track.stop());
                reject(new Error('Error capturando la imagen'));
              }
            }, 500); // Esperar 500ms para estabilizar la imagen

          } catch (setupError) {
            stream.getTracks().forEach(track => track.stop());
            reject(new Error('Error configurando la captura'));
          }
        };

        video.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error('Error reproduciendo el video'));
        };

        // Timeout de seguridad
        setTimeout(() => {
          if (video.readyState < 3) { // HAVE_FUTURE_DATA
            stream.getTracks().forEach(track => track.stop());
            reject(new Error('Tiempo de espera agotado'));
          }
        }, 10000);
      });

    } catch (error) {
      console.error('Error con Web Camera:', error);
      
      if ((error as any).name === 'NotAllowedError') {
        throw new Error('Permisos de cámara denegados');
      } else if ((error as any).name === 'NotFoundError') {
        throw new Error('No se encontró una cámara');
      } else if ((error as any).name === 'NotReadableError') {
        throw new Error('La cámara está siendo usada por otra aplicación');
      } else {
        throw new Error('Error accediendo a la cámara: ' + (error as Error).message);
      }
    }
  }

  // Tomar foto desde galería (opcional)
  async selectFromGallery(): Promise<string> {
    try {
      if (this.platform.is('capacitor')) {
        console.log('Seleccionando imagen desde galería...');
        
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: true,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos
        });
        
        if (!image.dataUrl) {
          throw new Error('No se pudo obtener la imagen de la galería');
        }
        
        return image.dataUrl;
      } else {
        // Para web, usar input file
        return await this.selectWebFile();
      }
    } catch (error) {
      console.error('Error seleccionando desde galería:', error);
      throw error;
    }
  }

  // Seleccionar archivo en web
  private async selectWebFile(): Promise<string> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        
        if (!file) {
          reject(new Error('No se seleccionó ningún archivo'));
          return;
        }

        // Verificar que sea una imagen
        if (!file.type.startsWith('image/')) {
          reject(new Error('El archivo seleccionado no es una imagen'));
          return;
        }

        // Verificar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          reject(new Error('La imagen es muy grande (máximo 5MB)'));
          return;
        }

        const reader = new FileReader();
        
        reader.onload = () => {
          const result = reader.result as string;
          console.log('Imagen seleccionada desde archivo');
          resolve(result);
        };
        
        reader.onerror = () => {
          reject(new Error('Error leyendo el archivo'));
        };
        
        reader.readAsDataURL(file);
      };
      
      input.click();
    });
  }

  // Verificar disponibilidad de cámara
  async isCameraAvailable(): Promise<boolean> {
    try {
      if (this.platform.is('capacitor')) {
        // En Capacitor, verificar permisos
        const permissions = await Camera.checkPermissions();
        return permissions.camera === 'granted' || permissions.camera === 'prompt';
      } else {
        // En web, verificar API
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      }
    } catch (error) {
      console.error('Error verificando disponibilidad de cámara:', error);
      return false;
    }
  }

  // Redimensionar imagen (utilidad)
  resizeImage(dataUrl: string, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.8): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        const resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedDataUrl);
      };
      
      img.src = dataUrl;
    });
  }

  // Método de debug
  async getDebugInfo(): Promise<any> {
    try {
      const isAvailable = await this.isCameraAvailable();
      
      let permissions = 'N/A';
      if (this.platform.is('capacitor')) {
        try {
          const perms = await Camera.checkPermissions();
          permissions = perms.camera;
        } catch (error) {
          permissions = `Error: ${(error as Error).message}`;
        }
      }

      return {
        isAvailable,
        platform: this.platform.platforms(),
        permissions,
        hasMediaDevices: !!(navigator.mediaDevices),
        hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia)
      };
    } catch (error) {
      return {
        error: (error as Error).message,
        platform: this.platform.platforms()
      };
    }
  }
}