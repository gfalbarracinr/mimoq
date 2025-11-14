import { Injectable } from '@angular/core';
import { DespliegueInterface } from '../../core/interfaces/despliegue';

@Injectable({
  providedIn: 'root'
})
export class ExperimentoV2Service {
  private payload: any = {};
  private name: string = '';
  private duration: string = '';
  private replicas: number = 1;

  constructor() { }

  setName(name: string) {
    this.name = name;
  }

  getName() {
    return this.name;
  }
  setDuration(duration: string) {
    this.duration = duration;
  }

  getDuration() {
    return this.duration;
  }
  setReplicas(replicas: number) {
    this.replicas = replicas;
  }
  getReplicas() {
    return this.replicas;
  }

  addEndpointToPayload(microserviceID: string, endpointPayload: any) {
    if (this.payload[microserviceID]) {
      const currentValue = this.payload[microserviceID]
      this.payload[microserviceID] = [...currentValue, {...endpointPayload, id_microservicio: microserviceID}];
    } else {
      this.payload[microserviceID] = [{...endpointPayload, id_microservicio: microserviceID}]
    }
  }

  updateEndpoint(microserviceID: string, endpointPayload: any) {
    const payload = this.getEndpoints(microserviceID)
    this.payload[microserviceID] = payload.map((endpoint: any) => {
      if (endpoint.url === endpointPayload.url) {
        return {...endpointPayload, id_microservicio: microserviceID}
      }
      return endpoint
    })
  }
  
  deleteEndpoint(microserviceID: string, endpointUrl: string) {
    const payload = this.getEndpoints(microserviceID)
    this.payload[microserviceID] = payload.filter((endpoint: any) => endpoint.url !== endpointUrl)
  }

  getPayload() {
    return this.payload
  }

  getEndpoints(microserviceID: string) {
    return this.payload[microserviceID] ?? []
  }

  buildPayload(carga: any, endpoints: any, chaosExperiments?: any[]) {
    return {
      nombre: carga.nombre,
      replicas: carga.replicas,
      duracion: carga.duracion,
      servicios: carga.cargas.map(({ despliegue }: { despliegue: DespliegueInterface }) => {
        const id = despliegue.id_despliegue.toString();
        const matchingEndpoints = Object.values(endpoints)
          .flat()
          .filter((ep: any) => ep.id_microservicio === id);
  
        return {
          ...despliegue,
          endpoints: matchingEndpoints
        };
      }),
      ...(chaosExperiments && chaosExperiments.length > 0 && { chaosExperiments })
    };
  }

}
