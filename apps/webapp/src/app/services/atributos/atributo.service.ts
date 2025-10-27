import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AtributoInterface } from '../../core/interfaces/atributo';
import config from '../../config';
import { ConfigService } from '../../config.service';

@Injectable({
  providedIn: 'root'
})
export class AtributoService {

  private urlBackend: string = ''

  constructor(private httpClient: HttpClient, private configService: ConfigService) {
    const config = this.configService.getConfig()
    if (config.apiHostname === 'mimoq.local') {
      this.urlBackend = `http://${config.apiHostname}/api/atributo/`
    } else {
      this.urlBackend = `http://${config.apiHostname}:3000/api/atributo/`
    }
  }
  findAll(): Observable<AtributoInterface[]> {
    return this.httpClient.get<AtributoInterface[]>(this.urlBackend);
  }
  findById(nombre: string): Observable<AtributoInterface> {
    return this.httpClient.get<AtributoInterface>(this.urlBackend + `${nombre}`);
  }
}
