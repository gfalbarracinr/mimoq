// src/app/config.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  config = { apiHostname: 'server' }; // valor por defecto (cuando no hay window)

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Solo ejecutar esto si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      const { hostname } = window.location;

      switch (hostname) {
        case 'localhost':
          this.config = { apiHostname: 'localhost' };
          return;
        default:
          this.config = { apiHostname: 'server' };
          return;
      }
    }
    this.config = { apiHostname: 'localhost' };
  }

  getConfig() {
    return this.config;
  }
}
