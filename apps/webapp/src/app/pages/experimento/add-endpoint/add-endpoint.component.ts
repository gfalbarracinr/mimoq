import { Component, effect, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl
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
    vus: new FormControl(10, [Validators.required, Validators.min(1)]),
    thresholds: new FormControl(''),
    parametros: new FormControl(''),

    enableRampUp: new FormControl(false),
    rampUpStages: new FormArray([]), 

    enableCoolDown: new FormControl(false),
    coolDownDuration: new FormControl('', []),
    coolDownTarget: new FormControl(null)
  });

  private id!: string
  method!: string
  private endpoint!: string
  name!: string
  endpointsSignal: any;
  duration!: string;
  nameExperiment!: string;
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
    this.duration = this.route.snapshot.queryParamMap.get('duration')!
    this.nameExperiment = this.route.snapshot.queryParamMap.get('nameExperiment')!
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

  get rampUpStages(): FormArray {
    return this.experimentoForm.get('rampUpStages') as FormArray;
  }

  validateDurationSum() {
    return (control: AbstractControl) => {
      const duration = control.value;
      const totalDuration = convertirTiempoASegundos(this.duration);
      return duration && convertirTiempoASegundos(duration) > totalDuration ? { durationSum: true } : null;
    }
  }
  crearRampStage(duration = '', target = 10): FormGroup {
    return new FormGroup({
      duration: new FormControl(duration, [Validators.required, this.validateDurationSum()]),
      target: new FormControl(target, [Validators.required, Validators.min(1)])
    });
  }

  agregarRampStage() {
    this.rampUpStages.push(this.crearRampStage());
  }

  eliminarRampStage(index: number) {
    this.rampUpStages.removeAt(index);
  }

  toggleRampUp() {
    const enabled = this.experimentoForm.get('enableRampUp')?.value;
    if (enabled && this.rampUpStages.length === 0) {
      this.agregarRampStage();
    } else if (!enabled) {
      
      while (this.rampUpStages.length) {
        this.rampUpStages.removeAt(0);
      }
    }
  }

  onSubmit() {
    
    this.experimentoForm.markAllAsTouched();

    if (this.experimentoForm.invalid) {
      return;
    }

    const payload = this.experimentoForm.value;
    if (this.method === 'edit') {
      this.experimentoService.updateEndpoint(this.id, payload)
      this.router.navigate(['/experimento/crear'], {
        queryParams: {
          nameExperiment: this.nameExperiment,
          duration: this.duration
        }
      });
    } else {
      this.experimentoService.addEndpointToPayload(this.id, payload)
      this.router.navigate(['/experimento/crear'],{
        queryParams: {
          nameExperiment: this.nameExperiment,
          duration: this.duration
        }
      });
    }

  }

  onReset() {
    this.experimentoForm.reset({
      metodo: 'GET',
      vus: 10,
      enableRampUp: false,
      enableCoolDown: false
    });
    
    while (this.rampUpStages.length) this.rampUpStages.removeAt(0);
  }
  onDelete() {
    this.experimentoService.deleteEndpoint(this.id, this.endpoint);
    this.router.navigate(['/experimento/crear'], {
      queryParams: {
        nameExperiment: this.nameExperiment,
        duration: this.duration
      }
    });
  }
}

function convertirTiempoASegundos(tiempo: string): number {
  const unidades: { [key: string]: number } = {
    's': 1 / 60,
    'm': 1,
    'h': 60,
    'd': 1440
  };

  const regex = /(\d+)([smhd])/g;
  let sumaSegundos = 0;

  let match;
  while ((match = regex.exec(tiempo)) !== null) {
    const cantidad = parseInt(match[1]);
    const unidad = match[2];
    sumaSegundos += cantidad * unidades[unidad];
  }

  return sumaSegundos;
}