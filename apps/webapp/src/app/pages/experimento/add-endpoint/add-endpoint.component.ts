import { Component, effect, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { DespliegueService } from '../../../services/despliegue/despliegue.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperimentoV2Service } from '../../../services/experimentoV2/experimento-v2.service';

@Component({
  selector: 'app-add-endpoint',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgxPaginationModule],
  templateUrl: './add-endpoint.component.html',
  styleUrls: ['./add-endpoint.component.css']
})
export class AddEndpointComponent {
  experimentoForm = new FormGroup({
    url: new FormControl('', Validators.required),
    metodo: new FormControl('GET', Validators.required),
    duracion: new FormControl('30s', Validators.required),
    vus: new FormControl(10, [Validators.required, Validators.min(1)]),
    thresholds: new FormControl(''),
    parametros: new FormControl(''),

    // Ramp-up & Cool-down controls
    enableRampUp: new FormControl(false),
    rampUpStages: new FormArray([]), // array de { duration, target }

    enableCoolDown: new FormControl(false),
    coolDownDuration: new FormControl('', []),
    coolDownTarget: new FormControl(null)
  });

  private id!: string
  method!: string
  private endpoint!: string
  name!: string
  endpointsSignal: any;
  
  constructor(private despliegueService: DespliegueService,
     private route: ActivatedRoute, 
     private experimentoService: ExperimentoV2Service, 
     private router: Router) {}

  
  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.name = this.despliegueService.getDespliegue().find((despliegue) => despliegue.id_despliegue === parseInt(this.id))?.nombre ?? ""
    this.method = this.route.snapshot.queryParamMap.get('method')!
    this.endpoint = this.route.snapshot.queryParamMap.get('endpointUrl')!
    this.endpointsSignal = this.experimentoService.getEndpoints(this.id);
    if (this.method === 'edit') {
      const payload = this.experimentoService.getEndpoints(this.id)?.find((endpoint: any) => endpoint.url === this.encodeURL(this.endpoint))
      console.log("payload edit ", payload, this.experimentoService.getEndpoints(this.id), this.endpoint, this.encodeURL(this.endpoint))
      this.experimentoForm.patchValue(payload);
      this.experimentoForm.get('url')?.disable()
    }
  }

  encodeURL(url: string) {
    if (url === 'root') {
      return '/'
    }
    return `/${url}`
  }

  // Helpers para rampUpStages
  get rampUpStages(): FormArray {
    return this.experimentoForm.get('rampUpStages') as FormArray;
  }

  crearRampStage(duration = '', target = 10): FormGroup {
    return new FormGroup({
      duration: new FormControl(duration, Validators.required), // ej: "2m"
      target: new FormControl(target, [Validators.required, Validators.min(1)])
    });
  }

  agregarRampStage() {
    this.rampUpStages.push(this.crearRampStage());
  }

  eliminarRampStage(index: number) {
    this.rampUpStages.removeAt(index);
  }

  // Si el usuario activa ramp-up por primera vez, agregamos un stage por defecto
  toggleRampUp() {
    const enabled = this.experimentoForm.get('enableRampUp')?.value;
    if (enabled && this.rampUpStages.length === 0) {
      this.agregarRampStage();
    } else if (!enabled) {
      // opcional: limpiar stages si lo desactiva
      while (this.rampUpStages.length) {
        this.rampUpStages.removeAt(0);
      }
    }
  }

  onSubmit() {
    // marcar touched para validaciones
    this.experimentoForm.markAllAsTouched();

    if (this.experimentoForm.invalid) {
      console.warn('Formulario inválido', this.experimentoForm.value);
      return;
    }

    const payload = this.experimentoForm.value;
    console.log('Enviar configuración del experimento:', payload);
    if (this.method === 'edit') {
      this.experimentoService.updateEndpoint(this.id, payload)
      this.router.navigateByUrl('/experimento/crear');
    } else {
      this.experimentoService.addEndpointToPayload(this.id, payload)
      this.router.navigateByUrl('/experimento/crear');
    }
    

  }

  onReset() {
    this.experimentoForm.reset({
      metodo: 'GET',
      duracion: '30s',
      vus: 10,
      enableRampUp: false,
      enableCoolDown: false
    });
    // limpiar rampUpStages
    while (this.rampUpStages.length) this.rampUpStages.removeAt(0);
  }
  onDelete() {
    this.experimentoService.deleteEndpoint(this.id, this.endpoint)
    this.router.navigateByUrl('/experimento/crear');
  }
}
