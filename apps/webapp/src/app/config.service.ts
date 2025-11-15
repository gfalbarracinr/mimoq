
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  config = { apiHostname: 'server' }; 

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    
    if (isPlatformBrowser(this.platformId)) {
      const { hostname } = window.location;

      switch (hostname) {
        case 'localhost':
          this.config = { apiHostname: 'localhost' };
          return;
        case 'mimoq.local':
          this.config = { apiHostname: 'mimoq.local:32010' };
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
