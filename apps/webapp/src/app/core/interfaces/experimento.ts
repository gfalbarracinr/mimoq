import { DespliegueInterface } from "./despliegue";

export interface ExperimentoInterface {
    id_experimento: number;
    nombre: string;
    duracion: string; 
    cant_replicas: number;
    endpoints: string[];
    despliegues: DespliegueInterface[];
    nombres_archivos: string[];
    carga: number;
    tipo_chaos?: string; 
    namespace?: string; 
    configuracion_chaos?: Record<string, any>; 
    experiment_id?: string; 
}
