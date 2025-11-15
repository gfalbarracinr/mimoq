import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Carga } from '../../../core/model/carga/carga';
import { ExperimentoService } from '../../../services/experimento/experimento.service';
import { DespliegueService } from '../../../services/despliegue/despliegue.service';
import { DespliegueInterface } from '../../../core/interfaces/despliegue';
import { NgxPaginationModule } from 'ngx-pagination';
import { Experimento } from '../../../core/model/experimento/experimento';
import Swal from 'sweetalert2';
import { CargaService } from '../../../services/carga/carga.service';
import { CargaInterface } from '../../../core/interfaces/carga';
import { ROUTES_APP } from '../../../core/enum/routes.enum';
import { ExperimentoV2Service } from '../../../services/experimentoV2/experimento-v2.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { EndpointsComponent } from '../endpoints/endpoints.component';
import { ChaosType, ChaosMode, CreateChaosExperimentDto } from '../../../core/interfaces/chaos';

@Component({
  selector: 'app-experimento',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgxPaginationModule, AsyncPipe, NgIf, EndpointsComponent],
  templateUrl: './experimento.component.html',
  styleUrl: './experimento.component.css'
})
export class ExperimentoComponent implements OnInit {
  p: number = 1;
  nombre_despliegue: string = '';
  despliegue: DespliegueInterface = {} as DespliegueInterface;
  ids_despliegues: number[] = []
  inputHabilitado = false;
  
  carga: CargaInterface = {} as CargaInterface;
  cant_usuarios: string[] = [];
  duracion_picos: string[] = [];
  despliegues: DespliegueInterface[] = [];
  endpoints: string[] = [];
  status: boolean = false;
  showChaosForm: boolean = false;
  chaosExperiments: CreateChaosExperimentDto[] = [];

  chaosTypes = Object.values(ChaosType);
  chaosModes = Object.values(ChaosMode);
  selectedChaosType: ChaosType | null = null;

  experimentoForm = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    duracion: new FormControl('', [Validators.required]),
    replicas: new FormControl(1, [Validators.required]),
    cargaForm: new FormGroup({
      despliegue: new FormControl(''),
      endpoints: new FormControl('', [Validators.required]),
      vus: new FormControl('', [Validators.required, Validators.pattern("^\\d+(,\\d+)*$")]),
      picos: new FormControl('', [Validators.required, Validators.pattern("^\\d+[sm](,\\d+[sm])*$")])
    }, [Validators.required]),
    cargas: new FormArray([]),
    chaosForm: new FormGroup({
      type: new FormControl('', [Validators.required]),
      selectedMicroservice: new FormControl('', [Validators.required]),
      namespace: new FormControl('default'), 
      selector: new FormControl(''), 
      mode: new FormControl(ChaosMode.ONE),
      value: new FormControl(''),

      networkDelayLatency: new FormControl(''),
      networkDelayJitter: new FormControl(''),
      networkDelayCorrelation: new FormControl(''),
      
      networkLossLoss: new FormControl(''),
      networkLossCorrelation: new FormControl(''),
      
      networkBandwidthRate: new FormControl(''),
      
      stressWorkers: new FormControl(''),
      stressLoad: new FormControl(''),
      stressDuration: new FormControl(''),
      name: new FormControl('')
    })
  });

  constructor(
    private router: Router,
    private experimentoService: ExperimentoService,
    private cargaService: CargaService,
    private despliegueService: DespliegueService,
    public experimentoServiceV2: ExperimentoV2Service
  ) { }

  endpointsMap = new Map<string, any>();
  ngOnInit(): void {
    this.cargarDespliegues();
    
      console.log('Microservicios', this.despliegues)
      this.cargarMicroservicios();
      console.log('La espera ha terminado');
    
  }

  get cargas() {
    return this.experimentoForm.get('cargas') as FormArray;
  }

  getCurrentEndpoints(despliegueId: string) {
    return this.experimentoServiceV2.getEndpoints(despliegueId)
  }

  cargarDespliegues() {
    this.despliegues = this.despliegueService.getDespliegue();
    console.log('Despliegues', this.despliegues);
    this.nombre_despliegue = "" 
    console.log('ID id_despliegue', this.nombre_despliegue);

  }

  cargarMicroservicios() {
    this.despliegues.forEach((despliegue) => {
      const cargaForm = new FormGroup({
        despliegue: new FormControl(despliegue, [Validators.required])

      });
      (this.experimentoForm.get('cargas') as FormArray).push(cargaForm);
    });
  }

  createExperiment() {
    this.status = true;
    console.log(this.experimentoForm.value);
    console.log('payload', this.experimentoServiceV2.getPayload());

    const payload = this.experimentoServiceV2.buildPayload(
      this.experimentoForm.value, 
      this.experimentoServiceV2.getPayload(),
      this.chaosExperiments.length > 0 ? this.chaosExperiments : undefined
    );
    console.log('payload with chaos', payload);
    this.showLoading();
    this.cargaService.createExperiment(payload).subscribe({
      next: (res: any) => {
        console.log('Experimento creado', res);
        Swal.fire({
          title: "Experimento creado",
          text: "¿Deseas seleccionar métricas para este experimento?",
          icon: "success",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Si",
          cancelButtonText: "No, ver experimentos"
        }).then((result) => {
          console.log('result', result);
        });
      }, error: (error: any) => {
        console.error('Error creando el experimento', error);
        this.hideLoading();
      }
    });
  }

  crearExperimento() {
    this.status = true;
    console.log(this.experimentoForm.value);

    const sumatoriaPicos = sumarTiemposPorPosicion(this.duracion_picos);
    console.log('Sumatoria de picos', sumatoriaPicos);

    const newCarga: Carga = {
      cant_usuarios: this.cant_usuarios,
      duracion_picos: this.duracion_picos,
      duracion_total: sumatoriaPicos
    }
    this.showLoading();
    this.cargaService.create(newCarga).subscribe({
      next: (res: any) => {
        console.log('Carga creada', res);
        this.carga = res;
        console.log('Carga seteada', this.carga);
        console.log('Carga crear experimento', this.carga);
        if (this.carga) {
          console.log('Entra al if');
          const nuevoExperimento = this.experimentoForm.value;
          const data: Experimento = {
            nombre: nuevoExperimento.nombre || '',
            duracion: nuevoExperimento.duracion || '',
            cant_replicas: nuevoExperimento.replicas || 0,
            endpoints: this.endpoints,
            fk_ids_despliegues: this.ids_despliegues,
            fk_ids_metricas: [],
            fk_id_carga: this.carga.id_carga
          }
          console.log('Experimento a crear', data);
          this.experimentoService.setExperimento(data);
          Swal.fire({
            title: "Experimento creado",
            text: "¿Deseas seleccionar métricas para este experimento?",
            icon: "success",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Si",
            cancelButtonText: "No, ver experimentos"
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigateByUrl('/metricas');
              
            } else {
              this.router.navigateByUrl('/despliegues');
            }
          });

        }
      }, error: (error: any) => {
        console.error('Error creando carga', error);
        this.hideLoading();
      }

    });
  }
  incluir(index: any) {
    const formGroup = this.cargas.at(index);
    this.despliegue = formGroup.get('despliegue')?.value;
    console.log('despliegue', this.despliegue);
    const nuevaCarga = this.experimentoForm.get('cargaForm') as FormGroup;
    console.log('nueva carga', nuevaCarga);
    let endpoint = nuevaCarga.get('endpoints')?.value;
    let users = nuevaCarga.get('vus')?.value;
    let picos = nuevaCarga.get('picos')?.value;
    console.log(this.experimentoForm.value);
    this.ids_despliegues.push(this.despliegue.id_despliegue);
    this.endpoints.push(endpoint);
    this.cant_usuarios.push(users);
    this.duracion_picos.push(picos);
    console.log('ENDPOINTS', this.endpoints);
    console.log('UsUARIO', this.cant_usuarios);
    console.log('PICOS', this.duracion_picos);

    this.experimentoForm.get('cargaForm')?.reset();
    console.log('value form', this.experimentoForm.get('cargaForm')?.value);

  }

  modificar(index: any) {

  }
  verificarTiempos(tiempos: number[]): boolean {
    const duracionExperimento = convertirStringAMinutos(this.experimentoForm.get('duracion')?.value as string)
    console.log('Duracion experimento', duracionExperimento);
    let check: boolean = true;
    tiempos.forEach(elemento => {
      if (elemento > duracionExperimento) {
        check = false;
      }
    });
    console.log('Check', check);
    return check;
  }
  showLoading() {
    Swal.fire({
      title: 'Cargando...',
      text: 'Por favor espera!',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }
  hideLoading() {
    Swal.close();
  }
  addEndpoint(id:number) {
    this.router.navigate([`/microservice/${id}/endpoint`])
  }

  toggleChaosForm() {
    this.showChaosForm = !this.showChaosForm;
  }

  get chaosForm() {
    return this.experimentoForm.get('chaosForm') as FormGroup;
  }

  onChaosTypeChange() {
    const type = this.chaosForm.get('type')?.value;
    this.selectedChaosType = type as ChaosType;

    this.chaosForm.patchValue({
      networkDelayLatency: '',
      networkDelayJitter: '',
      networkDelayCorrelation: '',
      networkLossLoss: '',
      networkLossCorrelation: '',
      networkBandwidthRate: '',
      stressWorkers: '',
      stressLoad: '',
      stressDuration: ''
    });
  }

  onMicroserviceChange() {
    const microserviceId = this.chaosForm.get('selectedMicroservice')?.value;
    if (!microserviceId) return;

    const microservice = this.despliegues.find(d => d.id_despliegue.toString() === microserviceId);
    if (microservice) {
      
      this.chaosForm.patchValue({
        namespace: microservice.namespace || 'default',
        selector: `app=${microservice.nombre}`
      });
    }
  }

  parseSelector(selectorString: string): Record<string, string> {
    const selector: Record<string, string> = {};
    if (!selectorString) return selector;
    
    const pairs = selectorString.split(',');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        selector[key] = value;
      }
    });
    return selector;
  }

  addChaosExperiment() {
    if (!this.chaosForm.valid) {
      Swal.fire('Error', 'Por favor completa todos los campos requeridos', 'error');
      return;
    }

    const formValue = this.chaosForm.value;

    const microserviceId = formValue.selectedMicroservice;
    if (!microserviceId) {
      Swal.fire('Error', 'Por favor selecciona un microservicio', 'error');
      return;
    }

    const microservice = this.despliegues.find(d => d.id_despliegue.toString() === microserviceId);
    if (!microservice) {
      Swal.fire('Error', 'Microservicio no encontrado', 'error');
      return;
    }

    const selectorString = formValue.selector || `app=${microservice.nombre}`;
    const selector = this.parseSelector(selectorString);
    
    if (Object.keys(selector).length === 0) {
      Swal.fire('Error', 'El selector debe tener al menos un par clave=valor (ej: app=server)', 'error');
      return;
    }

    const namespace = formValue.namespace || microservice.namespace || 'default';

    const chaosExperiment: CreateChaosExperimentDto = {
      type: formValue.type as ChaosType,
      namespace: namespace,
      selector: selector,
      mode: formValue.mode as ChaosMode || ChaosMode.ONE,
      value: formValue.value ? parseInt(formValue.value) : undefined,
      
      duration: this.experimentoForm.get('duracion')?.value || '30s', 
      name: formValue.name || `${microservice.nombre}-${formValue.type}-${Date.now()}`
    };

    if (this.isNetworkDelayType(chaosExperiment.type) && formValue.networkDelayLatency) {
      chaosExperiment.networkDelay = {
        latency: formValue.networkDelayLatency,
        ...(formValue.networkDelayJitter && { jitter: formValue.networkDelayJitter }),
        ...(formValue.networkDelayCorrelation && { correlation: formValue.networkDelayCorrelation })
      };
    }

    if (this.isNetworkLossType(chaosExperiment.type) && formValue.networkLossLoss) {
      chaosExperiment.networkLoss = {
        loss: formValue.networkLossLoss,
        ...(formValue.networkLossCorrelation && { correlation: formValue.networkLossCorrelation })
      };
    }

    if (this.isNetworkBandwidthType(chaosExperiment.type) && formValue.networkBandwidthRate) {
      chaosExperiment.networkBandwidth = {
        rate: formValue.networkBandwidthRate
      };
    }

    if (this.isStressType(chaosExperiment.type)) {
      if (!formValue.stressWorkers || !formValue.stressLoad || !formValue.stressDuration) {
        Swal.fire('Error', 'Para experimentos de estrés, debes especificar workers, load y duration', 'error');
        return;
      }
      chaosExperiment.stress = {
        workers: parseInt(formValue.stressWorkers),
        load: parseInt(formValue.stressLoad),
        duration: formValue.stressDuration
      };
    }

    this.chaosExperiments.push(chaosExperiment);
    Swal.fire('Éxito', 'Experimento de caos añadido correctamente', 'success');
    this.chaosForm.reset({
      selectedMicroservice: '',
      namespace: 'default',
      mode: ChaosMode.ONE
    });
    this.selectedChaosType = null;
  }

  removeChaosExperiment(index: number) {
    this.chaosExperiments.splice(index, 1);
  }

  isNetworkDelayType(type: ChaosType): boolean {
    return type === ChaosType.NETWORK_DELAY;
  }

  isNetworkLossType(type: ChaosType): boolean {
    return type === ChaosType.NETWORK_LOSS;
  }

  isNetworkBandwidthType(type: ChaosType): boolean {
    return type === ChaosType.NETWORK_BANDWIDTH;
  }

  isStressType(type: ChaosType | null): boolean {
    if (!type) return false;
    return type === ChaosType.CPU_STRESS || 
           type === ChaosType.MEMORY_STRESS || 
           type === ChaosType.IO_STRESS;
  }

  formatSelector(selector: Record<string, string>): string {
    return Object.entries(selector).map(([key, value]) => `${key}=${value}`).join(', ');
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

function sumarTiemposPorPosicion(tiempos: string[]): string[] {
  const sumas: string[] = [];

  tiempos.forEach(elemento => {
    const tiempos = elemento.split(',');
    let sumaTotalSegundos = 0;

    tiempos.forEach(tiempo => {
      sumaTotalSegundos += convertirStringAMinutos(tiempo);
    });

    sumas.push(`${sumaTotalSegundos}m`);
  });

  return sumas;
}

function convertirStringAMinutos(tiempo: string): number {
  const unidades: { [key: string]: number } = {
    's': 1 / 60,
    'm': 1,
    'h': 60,
    'd': 1440
  };

  const regex = /(\d+)([smhd])/;
  const match = tiempo.match(regex);

  if (match) {
    const cantidad = parseInt(match[1]);
    const unidad = match[2];
    return cantidad * unidades[unidad];
  } else {
    
    return 0;
  }
  
}
