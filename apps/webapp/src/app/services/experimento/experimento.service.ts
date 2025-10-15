import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { ExperimentoInterface } from '../../core/interfaces/experimento';
import { Experimento } from '../../core/model/experimento/experimento';
import config from '../../config';
import { ConfigService } from '../../config.service';

@Injectable({
  providedIn: 'root'
})
export class ExperimentoService implements OnInit {

  nuevoExperimento: Experimento = {} as Experimento;
  iframes: string[] = [];
  private _refresh = new Subject<void>();
  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json"
    })
  };

  private urlBackend: string = ''
  constructor(private httpClient: HttpClient, private configService: ConfigService) { }

  get refresh() {
    return this._refresh;
  }

  findAll(): Observable<ExperimentoInterface[]> {
    return this.httpClient.get<ExperimentoInterface[]>(this.urlBackend);
  }
  findById(id: number): Observable<ExperimentoInterface> {
    return this.httpClient.get<ExperimentoInterface>(this.urlBackend + `${id}`);
  }

  findFile(id: number) {
    return this.httpClient.get(this.urlBackend + `archivos/${id}`,{ responseType: 'blob' });
  }

  public create(experimento: any): Observable<ExperimentoInterface> {
    return this.httpClient.post<ExperimentoInterface>(this.urlBackend, experimento, this.httpOptions);
  }

  public createDashboard(experimento: any): Observable<ExperimentoInterface> {
    return this.httpClient.post<ExperimentoInterface>(this.urlBackend + `dashboard`, experimento, this.httpOptions);
  }

  public delete(id: number): Observable<any> {
    return this.httpClient.delete(this.urlBackend + `${id}`)
    .pipe(
      tap(() => {
        this._refresh.next();
      })
    );;;
  }

  public update(experimento: any): Observable<ExperimentoInterface> {
    return this.httpClient.put<ExperimentoInterface>(this.urlBackend, experimento, this.httpOptions);
  }

  setExperimento(experimento: Experimento): void {
    this.nuevoExperimento = experimento;
  }

  getExperimento(): Experimento {
    return this.nuevoExperimento;
  }

  setIFrames(iframes: string[]): void{
    this.iframes = iframes;
  }

  getIFrames(): string[]{
    return this.iframes;
  }

  ngOnInit(): void {
    const config = this.configService.getConfig()
    this.urlBackend = `http://${config.apiHostname}:3000/api/experimento/`  
  }
}
