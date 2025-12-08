import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, Res } from '@nestjs/common';
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
import { K6Service } from '../../../k6/k6.service';
import { ChaosService } from '../../../chaos/services/chaos.service';
import { MetricsProcessorService } from '../../../k6/metrics-processor.service';
import { PrometheusService } from '../../../prometheus/prometheus.service';

@Injectable()
export class ExperimentoService {
  private readonly logger = new Logger(ExperimentoService.name);

  constructor(
    @InjectRepository(Experimento)
    private experimentoRepo: Repository<Experimento>,
    private despliegueUtilsService: DespliegueService,
    private metricaService: MetricaService,
    private cargaService: CargaService,
    private tableroService: TableroService,
    private k6Service: K6Service,
    private chaosService: ChaosService,
    private metricsProcessor: MetricsProcessorService,
    private prometheusService: PrometheusService,
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

  async findFiles(id: number, @Res() res: Response, metricasSeleccionadas: string[] = []) {
    try {
      const experiment = await this.experimentoRepo.findOne({
        where: { id_experimento: id },
        relations: ['despliegues'],
      });

      if (!(experiment instanceof Experimento)) {
        throw new NotFoundException(
          `Experimento con id #${id} no se encuentra en la Base de Datos`,
        );
      }

      const isPrometheusAvailable = await this.prometheusService.isAvailable();
      if (!isPrometheusAvailable) {
        throw new InternalServerErrorException('Prometheus no está disponible. No se pueden obtener las métricas.');
      }

      // Determinar qué métricas incluir
      const incluirTodas = metricasSeleccionadas.length === 0;
      const incluirStatusHTTP = incluirTodas || metricasSeleccionadas.includes('http_status');

      // Usar fechas guardadas en la DB si están disponibles, sino calcularlas
      let startTime: Date;
      let endTime: Date;
      
      if (experiment.fecha_inicio && experiment.fecha_fin) {
        startTime = experiment.fecha_inicio;
        endTime = experiment.fecha_fin;
        this.logger.log(`Usando fechas guardadas: ${startTime.toISOString()} - ${endTime.toISOString()}`);
      } else {
        // Fallback: calcular fechas basadas en la duración
        const now = new Date();
        const durationMs = this.parseDurationToMs(experiment.duracion);
        endTime = now;
        startTime = new Date(now.getTime() - durationMs - 300000);
        this.logger.warn(`Fechas no guardadas, calculando basado en duración: ${startTime.toISOString()} - ${endTime.toISOString()}`);
      } 

      const allPodNames: string[] = [];
      const serviceNames: string[] = [];
      let namespace = 'default';

      // Handle chaos-only experiments (no deployments but has chaos configuration)
      if ((!experiment.despliegues || experiment.despliegues.length === 0) && experiment.tipo_chaos) {
        namespace = experiment.namespace || 'default';
        
        // Try to find pods using the chaos selector
        if (experiment.configuracion_chaos?.selector) {
          const selector = experiment.configuracion_chaos.selector;
          
          // If selector is a string like "app=myapp", parse it
          if (typeof selector === 'string') {
            const parts = selector.split('=');
            if (parts.length === 2) {
              const labelKey = parts[0].trim();
              const labelValue = parts[1].trim();
              
              // Query Prometheus for pods with this label
              const query = `kube_pod_info{namespace="${namespace}",${labelKey}="${labelValue}"}`;
              try {
                const response = await this.prometheusService.query(query);
                if (response.status === 'success' && response.data.result) {
                  for (const result of response.data.result) {
                    const podName = result.metric.pod;
                    if (podName) {
                      allPodNames.push(podName);
                      // Extract service name from pod name (usually pod name contains service name)
                      const serviceName = podName.split('-')[0];
                      if (serviceName && !serviceNames.includes(serviceName)) {
                        serviceNames.push(serviceName);
                      }
                    }
                  }
                }
              } catch (error) {
                console.warn(`Error querying pods for chaos experiment: ${error.message}`);
              }
            }
          } else if (typeof selector === 'object') {
            // If selector is an object with labelSelectors
            const labelSelectors = selector.labelSelectors || selector;
            for (const [key, value] of Object.entries(labelSelectors)) {
              const query = `kube_pod_info{namespace="${namespace}",${key}="${value}"}`;
              try {
                const response = await this.prometheusService.query(query);
                if (response.status === 'success' && response.data.result) {
                  for (const result of response.data.result) {
                    const podName = result.metric.pod;
                    if (podName && !allPodNames.includes(podName)) {
                      allPodNames.push(podName);
                      const serviceName = podName.split('-')[0];
                      if (serviceName && !serviceNames.includes(serviceName)) {
                        serviceNames.push(serviceName);
                      }
                    }
                  }
                }
              } catch (error) {
                console.warn(`Error querying pods for chaos experiment: ${error.message}`);
              }
            }
          }
        }
        
        // If still no pods found, try to get all pods in the namespace
        if (allPodNames.length === 0) {
          try {
            const query = `kube_pod_info{namespace="${namespace}"}`;
            const response = await this.prometheusService.query(query);
            if (response.status === 'success' && response.data.result) {
              for (const result of response.data.result) {
                const podName = result.metric.pod;
                if (podName) {
                  allPodNames.push(podName);
                  const serviceName = podName.split('-')[0];
                  if (serviceName && !serviceNames.includes(serviceName)) {
                    serviceNames.push(serviceName);
                  }
                }
              }
            }
          } catch (error) {
            console.warn(`Error querying all pods in namespace: ${error.message}`);
          }
        }
      } else if (!experiment.despliegues || experiment.despliegues.length === 0) {
        throw new NotFoundException('El experimento no tiene despliegues asociados. No se pueden obtener métricas de pods.');
      } else {
        // Normal flow for experiments with deployments
        for (const despliegue of experiment.despliegues) {
          serviceNames.push(despliegue.nombre);

          const podNames = await this.prometheusService.findPodNames(
            despliegue.nombre,
            despliegue.namespace || 'default'
          );
          
          if (podNames.length === 0) {
            
            const helmPodNames = await this.prometheusService.findPodNames(
              despliegue.nombre_helm || despliegue.nombre,
              despliegue.namespace || 'default'
            );
            allPodNames.push(...helmPodNames);
          } else {
            allPodNames.push(...podNames);
          }
        }
        namespace = experiment.despliegues[0]?.namespace || 'default';
      }

      // Allow download even if no pods found for chaos experiments
      if (allPodNames.length === 0 && experiment.tipo_chaos) {
        // For chaos-only experiments, create a minimal CSV with experiment info
        const csvContent = this.generateChaosExperimentCSV(experiment);
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=ResultadosBE-${experiment.nombre || id}.zip`);

        const zip = archiver('zip');
        zip.pipe(res);

        const csvFileName = `${experiment.nombre || `experimento-${id}`}.csv`;
        zip.append(csvContent, { name: csvFileName });

        zip.finalize();
        return;
      }

      if (allPodNames.length === 0) {
        throw new NotFoundException(
          'No se encontraron pods asociados a los despliegues del experimento. ' +
          'Asegúrate de que los pods estén ejecutándose y que Prometheus los esté monitoreando.'
        );
      }

      const httpStatusMetricsPromise = incluirStatusHTTP 
        ? this.prometheusService.getHTTPStatusMetrics(serviceNames, namespace, startTime, endTime)
        : Promise.resolve({});

      const [cpuMetrics, memoryMetrics, networkMetrics, httpRequestMetrics, latencyMetrics, httpStatusMetrics] = await Promise.all([
        this.prometheusService.getPodCPUMetrics(allPodNames, namespace, startTime, endTime),
        this.prometheusService.getPodMemoryMetrics(allPodNames, namespace, startTime, endTime),
        this.prometheusService.getPodNetworkMetrics(allPodNames, namespace, startTime, endTime),
        this.prometheusService.getHTTPRequestMetrics(serviceNames, namespace, startTime, endTime),
        this.prometheusService.getHTTPLatencyMetrics(serviceNames, namespace, startTime, endTime),
        httpStatusMetricsPromise,
      ]);

      const allMetrics = {
        ...cpuMetrics,
        ...memoryMetrics,
        ...networkMetrics,
        ...httpRequestMetrics,
        ...latencyMetrics,
        ...httpStatusMetrics,
      };

      const hasData = Object.values(allMetrics).some((series: any) => Array.isArray(series) && series.length > 0);
      
      this.logger.log(`Verificando datos para experimento ${id}: hasData=${hasData}, total métricas=${Object.keys(allMetrics).length}`);
      
      if (!hasData) {
        this.logger.warn(`No se encontraron métricas para experimento ${id}. Métricas disponibles: ${Object.keys(allMetrics).join(', ')}`);
        
        // For chaos-only experiments, allow download even without metrics
        if (experiment.tipo_chaos && (!experiment.despliegues || experiment.despliegues.length === 0)) {
          this.logger.log(`Generando CSV mínimo para experimento de chaos ${id}`);
          const csvContent = this.generateChaosExperimentCSV(experiment);
          
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename=ResultadosBE-${experiment.nombre || id}.zip`);

          const zip = archiver('zip', {
            zlib: { level: 9 }
          });

          zip.on('error', (err) => {
            this.logger.error(`Error creando ZIP para chaos experiment: ${err.message}`);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error creando archivo ZIP' });
            }
          });

          zip.pipe(res);

          const csvFileName = `${experiment.nombre || `experimento-${id}`}.csv`;
          zip.append(csvContent, { name: csvFileName });

          zip.finalize();
          return;
        }
        
        // Para experimentos normales sin métricas, generar CSV vacío o con headers
        this.logger.warn(`Generando CSV con headers solamente para experimento ${id} (sin datos de métricas)`);
        
        const csvContent = this.generateCSVFromPrometheusPodMetrics(
          allMetrics,
          experiment,
          allPodNames,
          serviceNames,
          metricasSeleccionadas
        );

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=ResultadosBE-${experiment.nombre || id}.zip`);

        const zip = archiver('zip', {
          zlib: { level: 9 }
        });

        zip.on('error', (err) => {
          this.logger.error(`Error creando ZIP: ${err.message}`);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error creando archivo ZIP' });
          }
        });

        zip.pipe(res);

        const csvFileName = `${experiment.nombre || `experimento-${id}`}.csv`;
        zip.append(csvContent, { name: csvFileName });

        zip.finalize();
        return;
      }

      this.logger.log(`Generando CSV con ${Object.keys(allMetrics).length} métricas para experimento ${id}`);
      
      const csvContent = this.generateCSVFromPrometheusPodMetrics(
        allMetrics,
        experiment,
        allPodNames,
        serviceNames,
        metricasSeleccionadas
      );

      if (!csvContent || csvContent.trim().length === 0) {
        this.logger.warn(`CSV generado está vacío para experimento ${id}`);
        throw new InternalServerErrorException('No se pudo generar el contenido del CSV. Las métricas pueden estar vacías.');
      }

      this.logger.log(`CSV generado exitosamente (${csvContent.length} caracteres) para experimento ${id}`);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=ResultadosBE-${experiment.nombre || id}.zip`);

      const zip = archiver('zip', {
        zlib: { level: 9 }
      });

      zip.on('error', (err) => {
        this.logger.error(`Error creando ZIP: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error creando archivo ZIP' });
        }
      });

      zip.pipe(res);

      const csvFileName = `${experiment.nombre || `experimento-${id}`}.csv`;
      zip.append(csvContent, { name: csvFileName });

      zip.finalize();

      this.logger.log(`ZIP finalizado y enviado para experimento ${id}`);

    } catch (error) {
      this.logger.error(`Error en findFiles para experimento ${id}:`, error);
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Problemas obteniendo métricas del experimento: ${error}`,
      );
    }
  }

  private parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 300000; 
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 300000;
    }
  }

  private generateCSVFromPrometheusPodMetrics(
    metrics: Record<string, any[]>,
    experiment: Experimento,
    podNames: string[],
    serviceNames: string[],
    metricasSeleccionadas: string[] = []
  ): string {
    const csvRows: string[] = [];

    const incluirTodas = metricasSeleccionadas.length === 0;
    const incluirCPU = incluirTodas || metricasSeleccionadas.includes('cpu');
    const incluirMemoria = incluirTodas || metricasSeleccionadas.includes('memory');
    const incluirRedRecibir = incluirTodas || metricasSeleccionadas.includes('network_receive');
    const incluirRedTransmitir = incluirTodas || metricasSeleccionadas.includes('network_transmit');
    const incluirPeticiones = incluirTodas || metricasSeleccionadas.includes('http_requests');
    const incluirStatusHTTP = incluirTodas || metricasSeleccionadas.includes('http_status');
    const incluirLatencia = incluirTodas || metricasSeleccionadas.includes('latency');

    const headers: string[] = ['timestamp'];

    for (const podName of podNames) {
      if (incluirCPU) headers.push(`cpu_${podName}`);
      if (incluirMemoria) headers.push(`memory_mb_${podName}`);
      if (incluirRedRecibir) headers.push(`network_receive_bytes_${podName}`);
      if (incluirRedTransmitir) headers.push(`network_transmit_bytes_${podName}`);
    }

    for (const serviceName of serviceNames) {
      if (incluirPeticiones) headers.push(`http_requests_${serviceName}`);
      if (incluirLatencia) headers.push(`latency_seconds_${serviceName}`);
      if (incluirStatusHTTP) {
        // Agregar columnas para cada status code común
        const statusCodes = ['200', '201', '400', '401', '403', '404', '500', '502', '503', '504'];
        for (const statusCode of statusCodes) {
          headers.push(`http_status_${statusCode}_${serviceName}`);
        }
      }
    }
    
    csvRows.push(headers.join(','));

    const allTimestamps = new Set<number>();
    Object.values(metrics).forEach(seriesArray => {
      seriesArray.forEach(series => {
        if (series.values) {
          series.values.forEach(([timestamp]) => {
            allTimestamps.add(timestamp);
          });
        } else if (series.value) {
          allTimestamps.add(series.value[0]);
        }
      });
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const getValueAtTimestamp = (metricName: string, timestamp: number): string => {
      const seriesArray = metrics[metricName] || [];
      
      for (const series of seriesArray) {
        if (series.values) {
          
          for (let i = 0; i < series.values.length; i++) {
            const [ts, valueStr] = series.values[i];
            const timeDiff = Math.abs(ts - timestamp);
            if (timeDiff <= 30) {
              return valueStr;
            }
          }
          
          if (series.values.length > 0) {
            let closest = series.values[0];
            let minDiff = Math.abs(closest[0] - timestamp);
            for (const [ts, val] of series.values) {
              const diff = Math.abs(ts - timestamp);
              if (diff < minDiff) {
                minDiff = diff;
                closest = [ts, val];
              }
            }
            if (minDiff <= 60) { 
              return closest[1];
            }
          }
        } else if (series.value) {
          const [ts, valueStr] = series.value;
          const timeDiff = Math.abs(ts - timestamp);
          if (timeDiff <= 30) {
            return valueStr;
          }
        }
      }
      return '0';
    };

    sortedTimestamps.forEach(timestamp => {
      const date = new Date(timestamp * 1000);
      const row: string[] = [date.toISOString()];

      for (const podName of podNames) {
        if (incluirCPU) {
          const cpuValue = getValueAtTimestamp(`cpu_${podName}`, timestamp);
          row.push(cpuValue);
        }
        
        if (incluirMemoria) {
          const memoryBytes = parseFloat(getValueAtTimestamp(`memory_${podName}`, timestamp));
          const memoryMB = isNaN(memoryBytes) ? '0' : (memoryBytes / 1024 / 1024).toFixed(2);
          row.push(memoryMB);
        }
        
        if (incluirRedRecibir) {
          const networkReceive = getValueAtTimestamp(`network_receive_${podName}`, timestamp);
          row.push(networkReceive);
        }
        
        if (incluirRedTransmitir) {
          const networkTransmit = getValueAtTimestamp(`network_transmit_${podName}`, timestamp);
          row.push(networkTransmit);
        }
      }

      for (const serviceName of serviceNames) {
        if (incluirPeticiones) {
          const httpRequests = getValueAtTimestamp(`http_requests_${serviceName}`, timestamp);
          row.push(httpRequests);
        }
        
        if (incluirLatencia) {
          let latencyValue = getValueAtTimestamp(`latency_${serviceName}`, timestamp);
          const latencyNum = parseFloat(latencyValue);
          if (!isNaN(latencyNum) && latencyNum > 1000) {
            latencyValue = (latencyNum / 1000).toFixed(4);
          }
          row.push(latencyValue);
        }

        if (incluirStatusHTTP) {
          // Agregar valores para cada status code
          const statusCodes = ['200', '201', '400', '401', '403', '404', '500', '502', '503', '504'];
          for (const statusCode of statusCodes) {
            const statusValue = getValueAtTimestamp(`http_status_${statusCode}_${serviceName}`, timestamp);
            row.push(statusValue);
          }
        }
      }
      
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private generateChaosExperimentCSV(experiment: Experimento): string {
    const csvRows: string[] = [];
    
    // Header row
    const headers = [
      'experiment_id',
      'nombre',
      'tipo_chaos',
      'namespace',
      'duracion',
      'selector',
      'mode',
      'value',
      'kubernetes_name',
      'network_delay',
      'network_loss',
      'network_bandwidth',
      'stress_config'
    ];
    csvRows.push(headers.join(','));
    
    // Data row
    const config = experiment.configuracion_chaos || {};
    const selector = typeof config.selector === 'string' 
      ? config.selector 
      : (config.selector ? JSON.stringify(config.selector) : '');
    
    const stressConfig = config.stress ? JSON.stringify(config.stress) : '';
    
    const row = [
      experiment.experiment_id || '',
      experiment.nombre || '',
      experiment.tipo_chaos || '',
      experiment.namespace || '',
      experiment.duracion || '',
      selector,
      config.mode || '',
      config.value || '',
      config.kubernetesName || '',
      config.networkDelay || '',
      config.networkLoss || '',
      config.networkBandwidth || '',
      stressConfig
    ];
    
    csvRows.push(row.join(','));
    
    return csvRows.join('\n');
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
      .filter(metric => metric.grupo === 'HTTP') 
      .map(metric => metric.nombre_prometheus);  

    const metricsInfraToPanels = metrics
      .filter(metric => metric.grupo !== 'HTTP') 
      .map(metric => metric.nombre_prometheus);  

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

      const searchStrings = deployments.map(deploy => deploy.nombre).join(',');

      const podsNamesCommand = `bash utils/build-results-metrics/search-pod-name.sh -n default -s ${searchStrings}`;
      let allNamesPods = '';

      try {
        
        const { stdout: podsStdout, stderr: podsStderr } = await this.despliegueUtilsService.executeCommand(podsNamesCommand);
        if (podsStderr) {
          console.error(`Error en el comando para obtener nombres de pods: ${podsStderr}`);
        } else {
          allNamesPods = podsStdout.trim(); 
        }

        const buildCommand = `kubectl get pods --no-headers | grep "Running" | wc -l`;
        const { stdout: buildStdout, stderr: buildStderr } = await this.despliegueUtilsService.executeCommand(buildCommand);

        if (buildStderr) {
          console.error(`Error en el comando para contar pods en estado "Running": ${buildStderr}`);
        } else {
          
          const numberOfRunningPods = parseInt(buildStdout.trim(), 10); 
          console.log(`Número de pods en estado "Running": ${numberOfRunningPods}`);
        }
      } catch (error) {
        console.error(`Error al ejecutar los comandos: ${error.message}`);
      }

      const metricsHttpToPanels = metrics
        .filter(metric => metric.grupo === 'HTTP') 
        .map(metric => metric.submetricas);  

      const dataPodScriptPath = 'utils/build-results-metrics/cpu-memory-pod.sh';
      const dataPodCommand = `bash ${dataPodScriptPath} -p ${allNamesPods} -n default -f ${directoryPath}/cpu-memory-pods.csv -r ${data.duracion}`
      this.executeCommand(dataPodCommand);

      for (let i = 0; i < deployments.length; i++) {
        const nombres_archivos = await this.generateLoad(deployments, load, data, directoryPath, i, newExperiment, metricsHttpToPanels);
        if (!newExperiment.nombres_archivos) {
          newExperiment.nombres_archivos = []; 
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

  async getExperimentStatus(id: number): Promise<{ status: string; k6Status?: string; chaosStatus?: string }> {
    try {
      const experiment = await this.experimentoRepo.findOne({
        where: { id_experimento: id },
        relations: ['despliegues'],
      });

      if (!experiment) {
        throw new NotFoundException(`Experimento con id ${id} no encontrado`);
      }

      let k6Status: string | undefined;
      let chaosStatus: string | undefined;
      const statuses: string[] = [];

      if (!experiment.tipo_chaos && experiment.experiment_id) {
        try {
          // No intentar buscar TestRun por nombre del experimento ya que no coincide
          // El nombre del experimento en DB es diferente al nombre del TestRun en K8s
          // Los TestRuns se identifican por el experiment_id en sus labels, no por nombre
          // Por ahora, simplemente marcamos como Unknown ya que no podemos buscar por nombre
          k6Status = 'Unknown';
          statuses.push('Unknown');
        } catch (error) {
          console.error(`Unexpected error getting K6 status for experiment ${id}:`, error);
          k6Status = 'Unknown';
          statuses.push('Unknown');
        }
      }

      if (experiment.tipo_chaos && experiment.namespace && experiment.configuracion_chaos?.kubernetesName) {
        try {
          const chaosExp = await this.chaosService.getChaosExperimentStatus(
            experiment.tipo_chaos as any,
            experiment.namespace,
            experiment.configuracion_chaos.kubernetesName
          );
          const phase = chaosExp.status?.experiment?.phase || chaosExp.status?.phase || 'Unknown';
          chaosStatus = phase;
          statuses.push(phase);
        } catch (error: any) {
          
          if (error.statusCode === 404 || (error.response && error.response.statusCode === 404)) {
            chaosStatus = 'Completed'; 
            statuses.push('Completed');
          } else {
            console.error(`Error getting Chaos status for experiment ${id}:`, error);
            chaosStatus = 'Unknown';
            statuses.push('Unknown');
          }
        }
      }

      let overallStatus = 'Unknown';
      if (statuses.length === 0) {
        overallStatus = 'Unknown';
      } else if (statuses.some(s => s === 'Running' || s === 'Pending')) {
        overallStatus = 'Running';
      } else if (statuses.some(s => s === 'Failed' || s === 'Error')) {
        overallStatus = 'Failed';
      } else if (statuses.every(s => s === 'Completed' || s === 'Finished')) {
        overallStatus = 'Completed';
      } else {
        overallStatus = statuses[0];
      }

      return {
        status: overallStatus,
        k6Status,
        chaosStatus,
      };
    } catch (error) {
      console.error(`Error getting experiment status for id ${id}:`, error);
      throw new InternalServerErrorException(
        `Error obteniendo el estado del experimento: ${error}`,
      );
    }
  }

  removeExperiment(id: number) {
    return this.experimentoRepo.delete(id);
  }

  async checkExperimentFiles(id: number) {
    try {
      const experiment = await this.experimentoRepo.findOne({
        where: { id_experimento: id },
      });

      if (!experiment) {
        throw new NotFoundException(`Experimento con id #${id} no se encuentra en la Base de Datos`);
      }

      const formattedExperimentName = experiment.nombre?.toLowerCase().replace(/\s+/g, '-') || experiment.nombre;
      const experimentDir = path.join(__dirname, '../../../../', `utils/resultados-experimentos/${formattedExperimentName}`);

      const result: any = {
        experimentId: id,
        experimentName: experiment.nombre,
        experimentIdField: experiment.experiment_id,
        nombresArchivosInBD: experiment.nombres_archivos || [],
        directoryExists: fs.existsSync(experimentDir),
        directoryPath: experimentDir,
        filesInDirectory: [],
        filesStatus: [],
      };

      if (fs.existsSync(experimentDir)) {
        const files = fs.readdirSync(experimentDir);
        result.filesInDirectory = files;

        if (experiment.nombres_archivos && Array.isArray(experiment.nombres_archivos)) {
          for (const fileName of experiment.nombres_archivos) {
            const filePath = path.join(experimentDir, fileName);
            result.filesStatus.push({
              fileName,
              exists: fs.existsSync(filePath),
              path: filePath,
              size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error(`Error checking files for experiment ${id}:`, error);
      throw new InternalServerErrorException(
        `Error verificando archivos del experimento: ${error}`,
      );
    }
  }

  async regenerateExperimentFiles(id: number) {
    try {
      const experiment = await this.experimentoRepo.findOne({
        where: { id_experimento: id },
      });

      if (!experiment) {
        throw new NotFoundException(`Experimento con id #${id} no se encuentra en la Base de Datos`);
      }

      if (!experiment.experiment_id) {
        throw new BadRequestException(`El experimento no tiene experiment_id asociado`);
      }

      const basePath = '/test-result';
      const experimentId = experiment.experiment_id;

      let foundFiles: string[] = [];
      if (fs.existsSync(basePath)) {
        const searchForJsonFiles = (dir: string, depth: number = 0): string[] => {
          if (depth > 5) return []; 
          const files: string[] = [];
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                files.push(...searchForJsonFiles(fullPath, depth + 1));
              } else if (entry.isFile() && entry.name.endsWith('.json') && fullPath.includes(experimentId)) {
                files.push(fullPath);
              }
            }
          } catch (error) {
            
          }
          return files;
        };
        foundFiles = searchForJsonFiles(basePath);
      }

      if (foundFiles.length === 0) {
        return {
          success: false,
          message: 'No se encontraron archivos JSON para este experimento en el PVC compartido',
          experimentId: experiment.experiment_id,
          searchedPath: basePath,
        };
      }

      const results = [];
      for (const jsonFile of foundFiles) {
        try {
          
          const pathParts = jsonFile.split('/');
          const userLabel = pathParts[pathParts.length - 2];
          const fileName = pathParts[pathParts.length - 1];
          const testName = fileName.replace(/^(metrics-|summary-|output-)/, '').replace(/\.json$/, '');

          const metricsData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

          const additionalLabels: Record<string, string> = {};
          if (experiment.despliegues && experiment.despliegues.length > 0) {
            additionalLabels.service = experiment.despliegues[0].nombre || 'unknown';
          }
          if (experiment.endpoints && experiment.endpoints.length > 0) {
            const endpoint = experiment.endpoints[0];
            additionalLabels.endpoint = endpoint.replace(/\W+/g, '-');
          }

          await this.metricsProcessor.processK6Metrics(
            userLabel,
            experimentId,
            testName,
            additionalLabels
          );

          results.push({
            file: jsonFile,
            processed: true,
            testName,
          });
        } catch (error) {
          results.push({
            file: jsonFile,
            processed: false,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        message: `Procesados ${results.filter(r => r.processed).length} de ${results.length} archivos`,
        results,
      };
    } catch (error) {
      console.error(`Error regenerating files for experiment ${id}:`, error);
      throw new InternalServerErrorException(
        `Error regenerando archivos del experimento: ${error}`,
      );
    }
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
