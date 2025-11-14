export interface MetricaDisponible {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoMetrica;
  disponible: boolean; 
}

export enum TipoMetrica {
  CPU = 'CPU',
  MEMORIA = 'MEMORIA',
  RED = 'RED',
  PETICIONES = 'PETICIONES',
  LATENCIA = 'LATENCIA'
}

export interface GrupoMetricas {
  tipo: TipoMetrica;
  nombre: string;
  descripcion: string;
  metricas: MetricaDisponible[];
}

export interface MetricasSeleccionadas {
  [key: string]: boolean; 
}

