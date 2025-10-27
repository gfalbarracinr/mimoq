import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { Proyecto } from '../../core/model/proyecto/proyecto';
import { ProyectoInterface } from '../../core/interfaces/proyecto';
import { ConfigService } from '../../config.service';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  nuevoProyecto: ProyectoInterface = {} as ProyectoInterface;
  private _refresh = new Subject<void>();
  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json"
    })
  };
  private urlBackend: string = ''
  constructor(private httpClient: HttpClient, private configService: ConfigService) { 
    const config = this.configService.getConfig()
    if (config.apiHostname === 'mimoq.local') {
      this.urlBackend = `http://${config.apiHostname}/api/proyecto/`
    } else {
      this.urlBackend = `http://${config.apiHostname}:3000/api/proyecto/`
    }
  }

  get refresh() {
    return this._refresh;
  }

  findAll(): Observable<ProyectoInterface[]> {
    return this.httpClient.get<ProyectoInterface[]>(this.urlBackend); //of convierte a Observable
  }
  findById(id: number): Observable<ProyectoInterface> {
    return this.httpClient.get<ProyectoInterface>(this.urlBackend + `${id}`);
  }
  findByUser(id: number): Observable<ProyectoInterface[]> {
    return this.httpClient.get<ProyectoInterface[]>(this.urlBackend + `usuario/${id}`);
  }
  public create(proyecto: any): Observable<ProyectoInterface> {
    return this.httpClient.post<ProyectoInterface>(this.urlBackend, proyecto, this.httpOptions)
    .pipe(
      tap(() => {
        this._refresh.next();
      })
    );
  }

  public delete(id: number): Observable<Proyecto> {
    return this.httpClient.delete(this.urlBackend + `${id}`)
    .pipe(
      tap(() => {
        this._refresh.next();
      })
    );;
  }

  public update(proyecto: any): Observable<ProyectoInterface> {
    return this.httpClient.put<ProyectoInterface>(this.urlBackend, proyecto, this.httpOptions);
  }

  setProyecto(proyecto: ProyectoInterface): void {
    this.nuevoProyecto = proyecto;
  }
  getProyecto(): ProyectoInterface {
    return this.nuevoProyecto;
  }
}
