import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { ROUTES_APP } from '../../../../core/enum/routes.enum';
import Swal from 'sweetalert2';
import { ExperimentoService } from '../../../../services/experimento/experimento.service';
import { ExperimentoInterface } from '../../../../core/interfaces/experimento';
import { Subscription, forkJoin, Observable } from 'rxjs';
import { CargaInterface } from '../../../../core/interfaces/carga';
import { MetricaSelectorComponent } from '../../../../shared/metrica-selector/metrica-selector.component';

interface GroupedExperimento {
  id_experimento: number; 
  nombre: string;
  duracion: string;
  cant_replicas: number;
  experiment_id: string;
  tipos: string[];
  k6Experimento?: ExperimentoInterface;
  chaosExperimento?: ExperimentoInterface;
  despliegues?: any[];
  endpoints?: string[];
  namespace?: string;
  tipo_chaos?: string;
  configuracion_chaos?: Record<string, any>;
  status?: string; 
}

@Component({
  selector: 'app-list-experimentos',
  standalone: true,
  imports: [RouterLink, CommonModule, NgxPaginationModule, MetricaSelectorComponent],
  templateUrl: './list-experimentos.component.html',
  styleUrl: './list-experimentos.component.css'
})

export class ListExperimentosComponent implements OnInit {
  p: number = 1;
  experimentos: ExperimentoInterface[] = [];
  groupedExperimentos: GroupedExperimento[] = [];
  carga: CargaInterface[] = [];
  suscription : Subscription = new Subscription;

  constructor(private router: Router,
    private experimentoService: ExperimentoService) {}

  ngOnInit(): void {
    this.experimentoService.findAll().subscribe(experimentos => {
      console.log('Experimentos',experimentos);
      this.experimentos = experimentos;
      this.groupedExperimentos = this.groupExperimentsByExperimentId(experimentos);
      this.loadExperimentStatuses();
    });

    this.suscription = this.experimentoService.refresh.subscribe(() =>{
      this.experimentoService.findAll().subscribe(experimentos => {
        console.log('Experimentos sus',experimentos);
        this.experimentos = experimentos;
        this.groupedExperimentos = this.groupExperimentsByExperimentId(experimentos);
        this.loadExperimentStatuses();
      });
    })
  }

  loadExperimentStatuses(): void {
    this.groupedExperimentos.forEach(exp => {
      this.experimentoService.getStatus(exp.id_experimento).subscribe({
        next: (status) => {
          exp.status = status.status;
        },
        error: (error) => {
          console.error(`Error loading status for experiment ${exp.id_experimento}:`, error);
          exp.status = 'Unknown';
        }
      });
    });
  }

  getStatusColor(status?: string): string {
    if (!status) return 'gray';
    switch (status.toLowerCase()) {
      case 'completed':
      case 'finished':
        return 'green';
      case 'running':
      case 'pending':
        return 'yellow';
      case 'failed':
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  }

  getStatusText(status?: string): string {
    if (!status) return 'Desconocido';
    switch (status.toLowerCase()) {
      case 'completed':
      case 'finished':
        return 'Completado';
      case 'running':
      case 'pending':
        return 'Corriendo';
      case 'failed':
      case 'error':
        return 'Falló';
      default:
        return 'Desconocido';
    }
  }

  private groupExperimentsByExperimentId(experimentos: ExperimentoInterface[]): GroupedExperimento[] {
    const groupedMap = new Map<string, GroupedExperimento>();

    for (const exp of experimentos) {
      const experimentId = exp.experiment_id || `single-${exp.id_experimento}`;
      
      if (!groupedMap.has(experimentId)) {
        
        const grouped: GroupedExperimento = {
          id_experimento: exp.id_experimento,
          nombre: exp.nombre || '',
          duracion: exp.duracion || '',
          cant_replicas: exp.cant_replicas || 0,
          experiment_id: experimentId,
          tipos: [],
          despliegues: [],
          endpoints: [],
        };

        if (exp.tipo_chaos) {
          grouped.tipos.push('Chaos');
          grouped.chaosExperimento = exp;
          grouped.namespace = exp.namespace;
          grouped.tipo_chaos = exp.tipo_chaos;
          grouped.configuracion_chaos = exp.configuracion_chaos;
        } else {
          grouped.tipos.push('K6');
          grouped.k6Experimento = exp;
          grouped.despliegues = exp.despliegues || [];
          grouped.endpoints = exp.endpoints || [];
        }

        groupedMap.set(experimentId, grouped);
      } else {
        
        const existing = groupedMap.get(experimentId)!;
        
        if (exp.tipo_chaos) {
          if (!existing.tipos.includes('Chaos')) {
            existing.tipos.push('Chaos');
          }
          existing.chaosExperimento = exp;
          existing.namespace = exp.namespace;
          existing.tipo_chaos = exp.tipo_chaos;
          existing.configuracion_chaos = exp.configuracion_chaos;
        } else {
          if (!existing.tipos.includes('K6')) {
            existing.tipos.push('K6');
          }
          existing.k6Experimento = exp;
          existing.despliegues = exp.despliegues || [];
          existing.endpoints = exp.endpoints || [];
          
          existing.id_experimento = exp.id_experimento;
        }
      }
    }

    return Array.from(groupedMap.values());
  }

  get ROUTES_APP(){
    return ROUTES_APP;
  }

  getChaosMode(configuracion_chaos: Record<string, any> | undefined): string {
    return configuracion_chaos?.['mode'] || 'N/A';
  }

  mostrarSelectorMetricas: boolean = false;
  experimentoIdParaDescarga: number | null = null;
  gruposMetricas: any[] = [];
  metricasSeleccionadas: any = {};

  descargarResultados(id_experimento:number){
    // Always show metric selector for all experiment types
    this.experimentoIdParaDescarga = id_experimento;
    this.inicializarMetricas();
    this.mostrarSelectorMetricas = true;
  }

  inicializarMetricas() {
    
    this.gruposMetricas = [
      {
        tipo: 'CPU',
        nombre: 'CPU',
        descripcion: 'Métricas de uso de CPU',
        metricas: [
          { id: 'cpu', nombre: 'Uso de CPU', descripcion: 'Uso de CPU por pod (cores)', disponible: true }
        ]
      },
      {
        tipo: 'MEMORIA',
        nombre: 'Memoria',
        descripcion: 'Métricas de uso de memoria',
        metricas: [
          { id: 'memory', nombre: 'Uso de Memoria', descripcion: 'Uso de memoria por pod (MB)', disponible: true }
        ]
      },
      {
        tipo: 'RED',
        nombre: 'Red',
        descripcion: 'Métricas de tráfico de red',
        metricas: [
          { id: 'network_receive', nombre: 'Bytes Recibidos', descripcion: 'Bytes recibidos por pod', disponible: true },
          { id: 'network_transmit', nombre: 'Bytes Transmitidos', descripcion: 'Bytes transmitidos por pod', disponible: true }
        ]
      },
      {
        tipo: 'PETICIONES',
        nombre: 'Peticiones HTTP',
        descripcion: 'Métricas de peticiones HTTP',
        metricas: [
          { id: 'http_requests', nombre: 'Total de Peticiones', descripcion: 'Número total de peticiones HTTP', disponible: true },
          { id: 'http_status', nombre: 'Status HTTP', descripcion: 'Peticiones agrupadas por código de status (200, 404, 500, etc.)', disponible: true }
        ]
      },
      {
        tipo: 'LATENCIA',
        nombre: 'Latencia',
        descripcion: 'Métricas de latencia de respuesta',
        metricas: [
          { id: 'latency', nombre: 'Latencia de Respuesta', descripcion: 'Tiempo de respuesta HTTP (segundos)', disponible: true }
        ]
      }
    ];

    this.gruposMetricas.forEach(grupo => {
      grupo.metricas.forEach((metrica: any) => {
        if (metrica.disponible) {
          this.metricasSeleccionadas[metrica.id] = true;
        }
      });
    });
  }

  onMetricasChange(metricas: any) {
    this.metricasSeleccionadas = metricas;
  }

  cerrarSelector() {
    this.mostrarSelectorMetricas = false;
    this.experimentoIdParaDescarga = null;
  }

  aplicarMetricas() {
    if (!this.experimentoIdParaDescarga) {
      this.cerrarSelector();
      return;
    }

    const metricasIds = Object.keys(this.metricasSeleccionadas)
      .filter(id => this.metricasSeleccionadas[id]);

    this.experimentoService.findFile(this.experimentoIdParaDescarga, metricasIds)
      .subscribe({
        next: (data: Blob) => {
          const blob = new Blob([data], { type: 'application/zip' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Resultados completos';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.cerrarSelector();
        },
        error: (error) => {
          console.error('Error descargando resultados:', error);
          alert('Error al descargar los resultados. Por favor, intente nuevamente.');
          this.cerrarSelector();
        }
      });
  }

  eliminarExperimento(groupedExp: GroupedExperimento): void{
    
    const deleteObservables: Observable<any>[] = [];
    if (groupedExp.k6Experimento) {
      deleteObservables.push(this.experimentoService.delete(groupedExp.k6Experimento.id_experimento));
    }
    if (groupedExp.chaosExperimento) {
      deleteObservables.push(this.experimentoService.delete(groupedExp.chaosExperimento.id_experimento));
    }

    Swal.fire({
      title: "¿Quieres eliminar este experimento?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Si, eliminar"
    }).then((result) => {
      if (result.isConfirmed) {
        if (deleteObservables.length === 0) {
          Swal.fire({
            title: "¡Error!",
            text: "No hay experimentos para eliminar.",
            icon: "error"
          });
          return;
        }

        forkJoin(deleteObservables).subscribe({
          next: () => {
            Swal.fire({
              title: "¡Eliminado!",
              text: "Su experimento ha sido eliminado.",
              icon: "success"
            });
            this.router.navigate([ROUTES_APP.EXPERIMENTO]);
          },
          error: (error) => {
            console.log(error);
            Swal.fire({
              title: "¡Error!",
              text: `Este experimento no pudo ser eliminado: ${error.error?.statusCode || 'Error desconocido'} ${error.error?.message || ''}`,
              icon: "error"
            });
          }
        });
      }
    });
  }

}
