import { ConfigService } from '../config.service';

export function buildApiUrl(configService: ConfigService, endpoint: string): string {
  const config = configService.getConfig();
  
  if (config.apiHostname === 'mimoq.local') {
    // En producción, usar el dominio sin puerto (Ingress maneja el routing)
    return `http://${config.apiHostname}/api${endpoint}`;
  } else {
    // En desarrollo, usar el puerto específico
    return `http://${config.apiHostname}:3000/api${endpoint}`;
  }
}
