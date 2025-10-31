import { ConfigService } from '../config.service';

export function buildApiUrl(configService: ConfigService, endpoint: string): string {
  const config = configService.getConfig();
  
  if (config.apiHostname === 'localhost') {
    // En desarrollo local, usar el puerto específico
    return `http://${config.apiHostname}:3000/api${endpoint}`;
  } else {
    
    return `http://${config.apiHostname}/api${endpoint}`;
  }
}
