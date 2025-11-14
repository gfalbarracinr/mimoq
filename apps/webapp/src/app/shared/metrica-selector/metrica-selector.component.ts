import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrupoMetricas, MetricaDisponible, MetricasSeleccionadas, TipoMetrica } from '../../core/interfaces/metrica-seleccion';

@Component({
  selector: 'app-metrica-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metrica-selector.component.html',
  styleUrl: './metrica-selector.component.css'
})
export class MetricaSelectorComponent implements OnInit {
  @Input() gruposMetricas: GrupoMetricas[] = [];
  @Input() metricasSeleccionadas: MetricasSeleccionadas = {};
  @Output() metricasChange = new EventEmitter<MetricasSeleccionadas>();
  @Output() cerrar = new EventEmitter<void>();

  todosSeleccionados: boolean = false;

  ngOnInit() {
    this.actualizarEstadoTodos();
  }

  toggleMetrica(metricaId: string) {
    this.metricasSeleccionadas[metricaId] = !this.metricasSeleccionadas[metricaId];
    this.actualizarEstadoTodos();
    this.metricasChange.emit({ ...this.metricasSeleccionadas });
  }

  toggleGrupo(tipo: TipoMetrica) {
    const grupo = this.gruposMetricas.find(g => g.tipo === tipo);
    if (!grupo) return;

    const todasSeleccionadas = grupo.metricas
      .filter(m => m.disponible)
      .every(m => this.metricasSeleccionadas[m.id]);

    grupo.metricas
      .filter(m => m.disponible)
      .forEach(m => {
        this.metricasSeleccionadas[m.id] = !todasSeleccionadas;
      });

    this.actualizarEstadoTodos();
    this.metricasChange.emit({ ...this.metricasSeleccionadas });
  }

  toggleTodos() {
    const todasDisponibles = this.gruposMetricas
      .flatMap(g => g.metricas)
      .filter(m => m.disponible);

    todasDisponibles.forEach(m => {
      this.metricasSeleccionadas[m.id] = !this.todosSeleccionados;
    });

    this.actualizarEstadoTodos();
    this.metricasChange.emit({ ...this.metricasSeleccionadas });
  }

  actualizarEstadoTodos() {
    const todasDisponibles = this.gruposMetricas
      .flatMap(g => g.metricas)
      .filter(m => m.disponible);

    this.todosSeleccionados = todasDisponibles.length > 0 &&
      todasDisponibles.every(m => this.metricasSeleccionadas[m.id]);
  }

  estaGrupoCompleto(tipo: TipoMetrica): boolean {
    const grupo = this.gruposMetricas.find(g => g.tipo === tipo);
    if (!grupo) return false;

    const metricasDisponibles = grupo.metricas.filter(m => m.disponible);
    if (metricasDisponibles.length === 0) return false;

    return metricasDisponibles.every(m => this.metricasSeleccionadas[m.id]);
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  obtenerMetricasSeleccionadas(): string[] {
    return Object.keys(this.metricasSeleccionadas)
      .filter(id => this.metricasSeleccionadas[id]);
  }

  aplicar() {
    
    this.cerrar.emit();
  }
}

