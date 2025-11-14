import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ExperimentoService } from '../../../services/experimento/experimento.service';
import { ExperimentoInterface } from '../../../core/interfaces/experimento';
import { ROUTES_APP } from '../../../core/enum/routes.enum';

@Component({
  selector: 'app-ver-experimento',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ver-experimento.component.html',
  styleUrl: './ver-experimento.component.css'
})
export class VerExperimentoComponent implements OnInit {
  experimento: ExperimentoInterface | null = null;
  experimentStatus: { status: string; k6Status?: string; chaosStatus?: string } | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public experimentoService: ExperimentoService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.getExperimento(parseInt(id));
      this.getStatus(parseInt(id));
    }
  }

  getExperimento(id: number): void {
    this.experimentoService.findById(id).subscribe({
      next: (experimento: ExperimentoInterface) => {
        this.experimento = experimento;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading experiment:', error);
        this.loading = false;
      }
    });
  }

  getStatus(id: number): void {
    this.experimentoService.getStatus(id).subscribe({
      next: (status) => {
        this.experimentStatus = status;
      },
      error: (error: any) => {
        console.error('Error loading experiment status:', error);
      }
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

  getChaosMode(configuracion_chaos: Record<string, any> | undefined): string {
    return configuracion_chaos?.['mode'] || 'N/A';
  }

  goBack(): void {
    this.router.navigate([ROUTES_APP.EXPERIMENTO]);
  }

  get ROUTES_APP() {
    return ROUTES_APP;
  }
}
