import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../config.service';
import { ChaosExperimentScheduleDto, CreateChaosExperimentDto } from '../../core/interfaces/chaos';

@Injectable({
  providedIn: 'root'
})
export class ChaosService {
  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json"
    })
  };
  private urlBackend: string = '';

  constructor(
    private httpClient: HttpClient,
    private configService: ConfigService
  ) {
    const config = this.configService.getConfig();
    if (config.apiHostname === 'mimoq.local') {
      this.urlBackend = `http://${config.apiHostname}/api/chaos/`;
    } else {
      this.urlBackend = `http://${config.apiHostname}:3000/api/chaos/`;
    }
  }

  createChaosExperiment(experiment: CreateChaosExperimentDto): Observable<any> {
    return this.httpClient.post<any>(this.urlBackend, experiment, this.httpOptions);
  }

  scheduleChaosExperiment(schedule: ChaosExperimentScheduleDto): Observable<any> {
    return this.httpClient.post<any>(`${this.urlBackend}schedule`, schedule, this.httpOptions);
  }

  listChaosExperiments(namespace: string, type?: string): Observable<any> {
    const params = type ? `?namespace=${namespace}&type=${type}` : `?namespace=${namespace}`;
    return this.httpClient.get<any>(`${this.urlBackend}experiments${params}`, this.httpOptions);
  }

  getChaosExperimentStatus(type: string, namespace: string, name: string): Observable<any> {
    return this.httpClient.get<any>(
      `${this.urlBackend}experiments/${type}/${namespace}/${name}`,
      this.httpOptions
    );
  }

  pauseChaosExperiment(type: string, namespace: string, name: string): Observable<any> {
    return this.httpClient.put<any>(
      `${this.urlBackend}experiments/${type}/${namespace}/${name}/pause`,
      {},
      this.httpOptions
    );
  }

  resumeChaosExperiment(type: string, namespace: string, name: string): Observable<any> {
    return this.httpClient.put<any>(
      `${this.urlBackend}experiments/${type}/${namespace}/${name}/resume`,
      {},
      this.httpOptions
    );
  }

  deleteChaosExperiment(type: string, namespace: string, name: string): Observable<any> {
    return this.httpClient.delete<any>(
      `${this.urlBackend}experiments/${type}/${namespace}/${name}`,
      this.httpOptions
    );
  }
}

