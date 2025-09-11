import { Injectable, InternalServerErrorException, NotFoundException, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { spawn } from 'child_process';
import { Repository } from 'typeorm';

import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { Response } from 'express';
import { CargaService } from '../carga/carga.service';
import { TableroService } from '../tablero/tablero.service';
import { DespliegueService } from '../../../proyecto/services/despliegue/despliegue.service';
import { Experimento } from '../../entities/experimento.entity';
import { MetricaService } from '../../../metrica/services/metrica/metrica.service';
import { CreateExperimentoDto, UpdateExperimentoDto } from '../../dtos/experimento.dto';
import { Despliegue } from '../../../proyecto/entities/despliegue.entity';
import { Metrica } from '../../../metrica/entities/metrica.entity';

@Injectable()
export class ExperimentoService {
  constructor(
    @InjectRepository(Experimento)
    private experimentoRepo: Repository<Experimento>,
    private despliegueUtilsService: DespliegueService,
    private metricaService: MetricaService,
    private cargaService: CargaService,
    private tableroService: TableroService,
  ) { }

  async findAll() {
    try {
      return await this.experimentoRepo.find({
        relations: ['carga', 'despliegues', 'metricas']
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando los experimentos: ${error}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const deployExperiment = await this.experimentoRepo.findOne({
        where: { id_experimento: id },
        relations: ['carga', 'despliegues', 'metricas']
      });
      if (!(deployExperiment instanceof Experimento)) {
        throw new NotFoundException(
          `Experimento con id #${id} no se encuentra en la Base de Datos`,
        );
      }
      return deployExperiment;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando a un experimento por id: ${error}`,
      );
    }
  }

  async findFiles(id: number, @Res() res: Response) {
    try {
      const experiment = await this.experimentoRepo.findOne({
        where: { id_experimento: id },
      });

      if (!(experiment instanceof Experimento)) {
        throw new NotFoundException(
          `Experimento con id #${id} no se encuentra en la Base de Datos`,
        );
      }

      const archivosPaths = experiment.nombres_archivos.map(nombre_archivo =>
        path.join(__dirname, '../../../../', `utils/resultados-experimentos/${experiment.nombre}`, nombre_archivo)
      );

      const archivosExistentes = archivosPaths.filter(archivoPath => fs.existsSync(archivoPath));

      if (archivosExistentes.length === 0) {
        throw new NotFoundException('No se encontraron archivos');
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=ResultadosBE`);

      const zip = archiver('zip');
      zip.pipe(res);

      archivosExistentes.forEach(archivoPath => {
        try {
          const nombre_archivo = path.basename(archivoPath);
          zip.append(fs.createReadStream(archivoPath), { name: nombre_archivo });
        } catch (error) {
          throw new Error(`Error al agregar archivo al zip: ${error}`);
        }
      });

      zip.finalize();

    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando a un experimento por id: ${error}`,
      );
    }
  }

  async buildDashboard(data: CreateExperimentoDto) {
    const metrics: Metrica[] = [];
    const deployments: Despliegue[] = [];
    const iframes: string[] = [];
    const basePath = './utils/resultados-experimentos';
    const formattedName = data.nombre.toLowerCase().replace(/\s+/g, '-');
    const directoryPath = path.join(basePath, formattedName);

    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
      console.log(`Directorio '${formattedName}' creado en '${basePath}'.`);
    } else {
      console.log(`El directorio '${formattedName}' ya existe en '${basePath}'.`);
    }

    for (const fk_id_metrica of data.fk_ids_metricas) {
      const metric = await this.metricaService.findOne(fk_id_metrica);
      if (!metric) throw new NotFoundException(`Metrica con id #${fk_id_metrica} no se encuentra en la Base de Datos`);
      metrics.push(metric);
    }

    const load = await this.cargaService.findOne(data.fk_id_carga);
    for (const fk_id_despliegue of data.fk_ids_despliegues) {
      const deployment = await this.despliegueUtilsService.findOne(fk_id_despliegue);
      if (!deployment) throw new NotFoundException(`Despliegue con id #${fk_id_despliegue} no se encuentra en la Base de Datos`);
      deployments.push(deployment);
    }

    const metricsHttpToPanels = metrics
      .filter(metric => metric.grupo === 'HTTP') // Filtramos las métricas que tienen el grupo 'http'
      .map(metric => metric.nombre_prometheus);  // Mapeamos las métricas filtradas a sus nombres Prometheus

    const metricsInfraToPanels = metrics
      .filter(metric => metric.grupo !== 'HTTP') // Filtramos las métricas que no tienen el grupo 'http'
      .map(metric => metric.nombre_prometheus);  // Mapeamos las métricas filtradas a sus nombres Prometheus

    for (let i = 0; i < deployments.length; i++) {
      const panelesSeleccionadosHttp = this.filterPanelsHttp(metricsHttpToPanels);
      this.writePanelJsonHttp(panelesSeleccionadosHttp, load.duracion_total[i], deployments[i], i, directoryPath);
      const iframe = await this.tableroService.loadDashboardHttp(data.nombre, deployments[i].nombre);
      iframes.push(iframe);
    }

    const panelesSeleccionadosInfra = this.filterPanelsInfra(metricsInfraToPanels);
    this.writePanelJsonInfra(panelesSeleccionadosInfra, directoryPath, data.nombre);
    const iframe = await this.tableroService.loadDashboardInfra(data.nombre);
    iframes.push(iframe);
    return iframes;
  }


  async createExperiment(data: CreateExperimentoDto) {
    try {
      const metrics: Metrica[] = [];
      const deployments: Despliegue[] = [];
      const basePath = './utils/resultados-experimentos';
      const newExperiment = this.experimentoRepo.create(data);
      const formattedName = data.nombre.toLowerCase().replace(/\s+/g, '-');
      const directoryPath = path.join(basePath, formattedName);

      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath);
      }

      for (const fk_id_metrica of data.fk_ids_metricas) {
        const metric = await this.metricaService.findOne(fk_id_metrica);
        if (!metric) throw new NotFoundException(`Metrica con id #${fk_id_metrica} no se encuentra en la Base de Datos`);
        metrics.push(metric);
      }

      const load = await this.cargaService.findOne(data.fk_id_carga);
      for (const fk_id_despliegue of data.fk_ids_despliegues) {
        const deployment = await this.despliegueUtilsService.findOne(fk_id_despliegue);
        if (!deployment) throw new NotFoundException(`Despliegue con id #${fk_id_despliegue} no se encuentra en la Base de Datos`);
        deployments.push(deployment);
      }

      // Convertir los nombres de los despliegues en una cadena separada por comas
      const searchStrings = deployments.map(deploy => deploy.nombre).join(',');

      // Comando para obtener los nombres de los pods que contienen las cadenas de búsqueda
      const podsNamesCommand = `bash utils/build-results-metrics/search-pod-name.sh -n default -s ${searchStrings}`;
      let allNamesPods = '';

      try {
        // Ejecutar el comando para obtener los nombres de los pods
        const { stdout: podsStdout, stderr: podsStderr } = await this.despliegueUtilsService.executeCommand(podsNamesCommand);
        if (podsStderr) {
          console.error(`Error en el comando para obtener nombres de pods: ${podsStderr}`);
        } else {
          allNamesPods = podsStdout.trim(); // La salida será una cadena de nombres de pods separados por comas
        }

        const buildCommand = `kubectl get pods --no-headers | grep "Running" | wc -l`;
        const { stdout: buildStdout, stderr: buildStderr } = await this.despliegueUtilsService.executeCommand(buildCommand);

        if (buildStderr) {
          console.error(`Error en el comando para contar pods en estado "Running": ${buildStderr}`);
        } else {
          // Procesar la salida del comando para contar pods en estado "Running"
          const numberOfRunningPods = parseInt(buildStdout.trim(), 10); // Convertir la salida a un número entero
          console.log(`Número de pods en estado "Running": ${numberOfRunningPods}`);
        }
      } catch (error) {
        console.error(`Error al ejecutar los comandos: ${error.message}`);
      }

      const metricsHttpToPanels = metrics
        .filter(metric => metric.grupo === 'HTTP') // Filtramos las métricas que tienen el grupo 'http'
        .map(metric => metric.submetricas);  // Mapeamos las métricas filtradas a sus nombres Prometheus

      // Ejecutar el script de monitoreo en paralelo usando la ruta absoluta y el identificador de iteración
      const dataPodScriptPath = 'utils/build-results-metrics/cpu-memory-pod.sh';
      const dataPodCommand = `bash ${dataPodScriptPath} -p ${allNamesPods} -n default -f ${directoryPath}/cpu-memory-pods.csv -r ${data.duracion}`
      this.executeCommand(dataPodCommand);

      for (let i = 0; i < deployments.length; i++) {
        const nombres_archivos = await this.generateLoad(deployments, load, data, directoryPath, i, newExperiment, metricsHttpToPanels);
        if (!newExperiment.nombres_archivos) {
          newExperiment.nombres_archivos = []; // Inicializa la propiedad si aún no está definida
        }
        newExperiment.nombres_archivos = newExperiment.nombres_archivos.concat(nombres_archivos);
      }

      newExperiment.iframes = data.iframes;
      newExperiment.despliegues = deployments;
      newExperiment.metricas = metrics;;
      newExperiment.carga = load;
      return this.experimentoRepo.save(newExperiment);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas creando el experimento: ${error}`,
      );
    }
  }

  private async generateLoad(deployments: Despliegue[], load: any, data: CreateExperimentoDto, directoryPath: string, i: number, newExperiment: Experimento, metricsHttp: string[]) {
    const dataHttpMetricsPath = 'utils/build-results-metrics/http-metrics.sh';
    const duration = data.duracion;

    const ipCluster = '127.0.0.1';
    const url = `http://${ipCluster}:${deployments[i].puerto}`;
    const dirLoad = './utils/generate-load-k6/load_test.js';
    console.log(`Generando carga en el microservicio que está en: ${url}`);
    const nombres_archivos: string[] = [];
    const deploymentName = deployments[i].nombre;
    newExperiment.tiempo_escalado = [];

    for (let j = 0; j < data.cant_replicas; j++) {
      const reconstructedMetrics = this.transformarSubmetricas(metricsHttp, deploymentName);
      const metricsArgument = reconstructedMetrics.map(metric => `'${metric}'`).join(' ');
      const dataHttpMetricsCommand = `bash ${dataHttpMetricsPath} ${duration} ${directoryPath}/${deploymentName}-${i}-repeticion-${j}.csv ${metricsArgument}`;
      // Ejecutar el comando
      this.executeCommand(dataHttpMetricsCommand);
      const loadCommand = `K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write k6 run -o experimental-prometheus-rw -e API_URL=${url} -e VUS="${load.cant_usuarios[i]}" -e DURATION="${load.duracion_picos[i]}" -e ENDPOINTS="${data.endpoints[j]}" -e DELIMITER="," --tag testid=${deploymentName} ${dirLoad}`;
      if (deployments[i].autoescalado) {
        console.log('entra...');
        const utilizacionCPU = deployments[i].utilization_cpu.toString();
        const monitorScriptPath = 'utils/monitor-hpa/monitor_hpa.sh';
        const args = [`${deploymentName}-hpa`, `${deploymentName}`, utilizacionCPU];
        const monitorProcess = spawn('bash', [monitorScriptPath, ...args]);

        monitorProcess.stdout.on('data', async (data) => {
          const responseTime = data.toString().trim();
          newExperiment.tiempo_escalado.push(responseTime);
          console.log(`Tiempo de escalamiento para ${deploymentName}, iteración ${j}: ${responseTime}`);
          await this.executeCommand(loadCommand);
          console.log(`Generó carga. Microserivicio ${i + 1}, repetición ${j + 1}.`);
          nombres_archivos.push(`${deploymentName}-${i}-repeticion-${j}.csv`);
        });

        monitorProcess.stderr.on('data', (data) => {
          console.error(`Error en el script de monitoreo: ${data.toString()}`);
        });

        monitorProcess.on('close', (code) => {
          console.log(`El script de monitoreo finalizó con el código ${code}`);
        });
      } else {
        this.executeCommand(loadCommand);
        console.log(`Generó carga. Microserivicio ${i + 1}, repetición ${j + 1}.`);
        nombres_archivos.push(`${deploymentName}-${i}-repeticion-${j}.csv`);
      }
    }

    return nombres_archivos;
  }


  private transformarSubmetricas(submetricasArray: string[], testid: string): string[] {
    return submetricasArray.flatMap(submetricas => {
      return submetricas.split(',').map(submetrica => `${submetrica}{testid="${testid}"}`);
    });
  }

  private filterPanelsHttp(metricsToPanels: string[]): any[] {
    const dataFile = fs.readFileSync('./utils/build-charts-dash/tmpl-panel-http.json', 'utf-8');
    const panels = JSON.parse(dataFile);
    const paneles = panels.filter((panel: any) => metricsToPanels.includes(panel.uid));
    return paneles;
  }

  private filterPanelsInfra(metricsToPanels: string[]): any[] {
    const dataFile = fs.readFileSync('./utils/build-charts-dash/tmpl-panel-infra.json', 'utf-8');
    const panels = JSON.parse(dataFile);
    const paneles = panels.filter((panel: any) => metricsToPanels.includes(panel.uid));
    return paneles;
  }

  private writePanelJsonHttp(panels: any[], duracion: string, deployment: Despliegue, index: number, directoryPath: string) {
    const panelesSeleccionados = panels;
    for (const panel of panelesSeleccionados) {
      for (const target of panel.targets) {
        if (target.expr?.includes("elpepe")) {
          target.expr = target.expr.replace(/elpepe/g, deployment.nombre);
        }
      }
    }

    fs.writeFile(`./utils/build-charts-dash/paneles-experiment-http.json`, JSON.stringify(panelesSeleccionados, null, 2), (err) => {
      if (err) {
        console.error('Error al guardar el service en el nuevo archivo JSON:', err);
        return;
      }
      this.addToJsonHttpDash(index, panelesSeleccionados, duracion, deployment, directoryPath);
    });
  }

  private writePanelJsonInfra(panels: any[], directoryPath: string, nombre: string) {
    const panelesSeleccionados = panels;

    fs.writeFile(`./utils/build-charts-dash/paneles-experiment-infra.json`, JSON.stringify(panelesSeleccionados, null, 2), (err) => {
      if (err) {
        console.error('Error al guardar el service en el nuevo archivo JSON:', err);
        return;
      }
      this.addToJsonInfraDash(panelesSeleccionados, directoryPath, nombre);
    });
  }

  private async addToJsonHttpDash(index: number, panelesSeleccionados: any, duracion: string, deployment: Despliegue, directoryPath: string) {
    try {
      const nombre = deployment.nombre;
      const dataDashboard = await fs.promises.readFile('./utils/build-charts-dash/tmpl-tablero-http.json', 'utf-8');
      const dashboard = JSON.parse(dataDashboard);
      dashboard.dashboard.title = `dash-${nombre}-http`;
      dashboard.dashboard.uid = `dash-${nombre}-http`;
      panelesSeleccionados.forEach((panel: any) => {
        dashboard.dashboard.panels.push(panel);
      });

      dashboard.dashboard.templating.list.forEach((item) => {
        if (item.current?.text === "elpepe") {
          item.current.text = deployment.nombre;
          item.current.value = `$__${deployment.nombre}`;
        }
      });
      await fs.promises.writeFile(`${directoryPath}/dash-${nombre}-http.json`, JSON.stringify(dashboard, null, 2));
    } catch (error) {
      console.error('Error al manipular archivos JSON:', error);
    }
  }

  private async addToJsonInfraDash(panelesSeleccionados: any, directoryPath: string, nombre: string) {
    try {
      const dataDashboard = await fs.promises.readFile('./utils/build-charts-dash/tmpl-tablero-infra.json', 'utf-8');
      const dashboard = JSON.parse(dataDashboard);
      dashboard.dashboard.title = `dash-${nombre}-infra`;
      dashboard.dashboard.uid = `dash-${nombre}-infra`;
      panelesSeleccionados.forEach((panel: any) => {
        dashboard.dashboard.panels.push(panel);
      });
      await fs.promises.writeFile(`${directoryPath}/dash-${nombre}-infra.json`, JSON.stringify(dashboard, null, 2));
    } catch (error) {
      console.error('Error al manipular archivos JSON:', error);
    }
  }

  async updateExperiment(id: number, cambios: UpdateExperimentoDto) {
    try {
      const deployExperiment = await this.experimentoRepo.findOneBy({ id_experimento: id });

      this.experimentoRepo.merge(deployExperiment, cambios);
      return this.experimentoRepo.save(deployExperiment);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas actualizando el experimento: ${error}`,
      );
    }
  }

  removeExperiment(id: number) {
    return this.experimentoRepo.delete(id);
  }

  private async executeCommand(command: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, { shell: true });
      childProcess.on('error', (error) => {
        reject(error);
      });
      let stdout = '';
      let stderr = '';
      childProcess.stdout.on('data', (data) => {
        stdout += data;
      });
      childProcess.stderr.on('data', (data) => {
        stderr += data;
      });
      childProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command exited with code ${code}: ${stderr}`));
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  private async executeCommandHPA(command: string, args: string[]): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, { shell: true });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command exited with code ${code}: ${stderr}`));
        } else {
          resolve({ stdout, stderr });
        }
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    });
  }
}
