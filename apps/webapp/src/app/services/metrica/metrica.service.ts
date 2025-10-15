import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { MetricaInterface } from '../../core/interfaces/metrica';
import config from '../../config';
import { ConfigService } from '../../config.service';

@Injectable({
  providedIn: 'root'
})
export class MetricaService implements OnInit{

  private urlBackend: string = ''

  constructor(private httpClient: HttpClient, private configService: ConfigService) { }
  findAll(): Observable<MetricaInterface[]> {
    return this.httpClient.get<MetricaInterface[]>(this.urlBackend);
  }
  findById(nombre: string): Observable<MetricaInterface> {
    return this.httpClient.get<MetricaInterface>(this.urlBackend + `${nombre}`);
  }
  ngOnInit(): void {
    const config = this.configService.getConfig()
    this.urlBackend = `http://${config.apiHostname}:3000/api/atributo/`
  }
}
