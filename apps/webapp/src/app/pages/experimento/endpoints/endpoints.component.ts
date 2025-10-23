import { Component, Input, OnInit } from '@angular/core';
import { ExperimentoV2Service } from '../../../services/experimentoV2/experimento-v2.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'endpoints',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './endpoints.component.html',
  styleUrl: './endpoints.component.css'
})
export class EndpointsComponent implements OnInit{
  @Input() despliegueId!: string
  endpoints: any[] = []
  constructor(private experimentoService: ExperimentoV2Service, private router: Router) { }
  ngOnInit(): void {
    this.endpoints = this.experimentoService.getEndpoints(this.despliegueId) ?? []
    console.log("this endpoints ", this.endpoints, this.despliegueId)
  }

  decodeURL(url: string) {
    if (url === '/') {
      return 'root'
    }
    return url.slice(1)
  }

  navigateTo(endpointUrl: string) {
    this.router.navigate(['/microservice', this.despliegueId, 'endpoint'], {
      queryParams: { method: 'edit', endpointUrl: this.decodeURL(endpointUrl)}
    })
  }

}
