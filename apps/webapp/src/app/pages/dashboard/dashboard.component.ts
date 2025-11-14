import { Component, OnInit } from '@angular/core';
import { TooltipDirective } from '../../core/directives/tooltip.directive';
import { ExperimentoService } from '../../services/experimento/experimento.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ROUTES_APP } from '../../core/enum/routes.enum';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TooltipDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  iframeHtml: SafeHtml | undefined;
  iframes: string[] = [];
  iframesHtml: SafeHtml[] = [];
  nombres: string[] = []
  iframeString: SafeHtml = '';
  id_experimento: number = 0;
  resultados: boolean = false;

  constructor(private experimentoService: ExperimentoService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.iframes = this.experimentoService.getIFrames();

    console.log('IFRAMES DASHBOARD', this.iframes);
    this.iframeString = this.iframes[0][0];
    console.log('IFRAME', this.iframeString)
    this.iframeHtml = this.sanitizer.bypassSecurityTrustHtml(this.iframes[0][0]);
    console.log('sirve', this.iframeHtml)
    for (let i = 0; i < this.iframes.length; i++) {
      const element = this.iframes[i];
      console.log('element', i)
      for (let j = 0; j < element.length; j++) {
        
        console.log('prueba', this.iframes[i][j])
        console.log('prueba2', element[j])
        let iframe = element[j]
        let panelID = this.getPanelIdFromIframe(element[j]);
        
        let newWidth: string = '450';
        let newHeight: string = '200';
        
          newWidth = "800"; 
          newHeight = "450";

        let newIframe = iframe.replace(`width="${450}"`, `width="${newWidth}"`).replace(`height="${200}"`, `height="${newHeight}"`);
        console.log('nuevo iframe', newIframe)
        this.iframesHtml.push(this.sanitizer.bypassSecurityTrustHtml(newIframe));
        let nombre = this.getNameFromIframe(iframe);
        this.nombres.push(nombre);
        
        console.log('nombres',this.nombres)
      }
    }

    console.log('htmls reformados', this.iframesHtml)
    this.crearExperimento();
  }
  crearExperimento() {
    const data = this.experimentoService.getExperimento();
    console.log('Experimento', data);
    
    this.experimentoService.create(data).subscribe({
      next: (res: any) => {
        console.log('Experimento creado', res);
        this.id_experimento = res.id_experimento;
        this.resultados = true;

      }, error: (error: any) => {
        console.error('Error creando el experimento', error);

      }

    });
  }

  descargarResultados(){
    console.log('ID_EXPERIMENTO',this.id_experimento);
    this.experimentoService.findFile(this.id_experimento)
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
      },
      error: (error) => {
        console.error('Error descargando resultados:', error);
        alert('Error al descargar los resultados. Por favor, intente nuevamente.');
      }
    });
  }

  getPanelIdFromIframe(iframe: string): string {
    const match = iframe.match(/panelId=(\d+)/);
    return match ? match[1] : ''; 
  }
  getNameFromIframe(iframe: string): string {
    
    let match = iframe.match(/localhost:8080\/d-solo\/([^/]+)\/panelexport/);
    
    return match ? match[1] : '';
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
}
