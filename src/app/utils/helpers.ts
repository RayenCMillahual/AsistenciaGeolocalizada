export class HelperFunctions {
  
    static formatDate(date: Date | string): string {
      const d = new Date(date);
      return d.toLocaleDateString('es-ES');
    }
  
    static formatTime(date: Date | string): string {
      const d = new Date(date);
      return d.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  
    static calculateWorkingHours(checkIn: Date | string, checkOut: Date | string): number {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }
  
    static getGreeting(): string {
      const hour = new Date().getHours();
      if (hour < 12) return 'Buenos días';
      if (hour < 18) return 'Buenas tardes';
      return 'Buenas noches';
    }
  
    static generateId(): string {
      return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
  
    static isValidEmail(email: string): boolean {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
  
    static compressImage(file: File, maxWidth: number = 800, quality: number = 0.8): Promise<Blob> {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        
        img.onload = () => {
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(resolve as BlobCallback, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
      });
    }
  
    static getDistanceFromCoords(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371; // Radio de la Tierra en km
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c * 1000; // Distancia en metros
    }
  
    private static deg2rad(deg: number): number {
      return deg * (Math.PI/180);
    }
  }