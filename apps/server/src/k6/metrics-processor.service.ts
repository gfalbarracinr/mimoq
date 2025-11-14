import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Experimento } from '../experimento/entities/experimento.entity';

@Injectable()
export class MetricsProcessorService {
    private readonly logger = new Logger(MetricsProcessorService.name);
    private readonly pushgatewayUrl = process.env.PUSHGATEWAY_URL || 'http://pushgateway:9091';
    private readonly resultsBasePath = path.join(__dirname, '../../../../utils/resultados-experimentos');

    constructor(
        @InjectRepository(Experimento)
        private experimentoRepo: Repository<Experimento>,
    ) {
        
        if (!fs.existsSync(this.resultsBasePath)) {
            fs.mkdirSync(this.resultsBasePath, { recursive: true });
        }
    }

    async processK6Metrics(userLabel: string, experimentId: string, testName: string, additionalLabels?: Record<string, string>) {
        try {
            const metricsPath = `/test-result/${userLabel}/${experimentId}/metrics-${testName.toLowerCase()}.json`;
            const summaryPath = `/test-result/${userLabel}/${experimentId}/summary-${testName.toLowerCase()}.json`;

            let dataPath = summaryPath;
            if (!fs.existsSync(summaryPath)) {
                dataPath = metricsPath;
                this.logger.warn(`No metrics files found: ${summaryPath}`);
                if (!fs.existsSync(metricsPath)) {
                    this.logger.warn(`No metrics files found: ${metricsPath}`);
                    return;
                }
            }

            const metricsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            const prometheusMetrics = this.convertToPrometheusFormat(metricsData, userLabel, experimentId, testName, additionalLabels);

            await this.sendToPushgateway(prometheusMetrics, testName, userLabel, experimentId, additionalLabels);

            let experimentos = await this.experimentoRepo.find({
                where: { experiment_id: experimentId }
            });

            if (experimentos.length === 0) {
                this.logger.warn(`Experimento con experiment_id ${experimentId} no encontrado, esperando 5 segundos y reintentando...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                experimentos = await this.experimentoRepo.find({
                    where: { experiment_id: experimentId }
                });
            }

            const experimentName = experimentos.length > 0 && experimentos[0].nombre 
                ? experimentos[0].nombre 
                : testName.toLowerCase();
            
            this.logger.log(`Procesando métricas para experimento: ${experimentName} (experiment_id: ${experimentId})`);

            const csvFileName = await this.generateAndSaveCSV(metricsData, experimentName, testName, experimentId, additionalLabels);

            if (csvFileName) {
                await this.updateExperimentoFiles(experimentId, csvFileName, experimentName);
            } else {
                this.logger.warn(`No se pudo generar el archivo CSV para ${testName}`);
            }
            
            this.logger.log(`Métricas procesadas y enviadas a Pushgateway para ${testName}`);
        } catch (error) {
            this.logger.error(`Error procesando métricas: ${error.message}`);
        }
    }

    private convertToPrometheusFormat(metricsData: any, userLabel: string, experimentId: string, testName: string, additionalLabels?: Record<string, string>): string {
        
        const baseLabels: string[] = [
            `user="${userLabel}"`,
            `experiment="${experimentId}"`,
            `test="${testName}"`
        ];

        if (additionalLabels) {
            Object.entries(additionalLabels).forEach(([key, value]) => {
                if (value) {
                    baseLabels.push(`${key}="${value}"`);
                }
            });
        }

        const labels = baseLabels.join(',');
        let prometheusMetrics = '';

        if (metricsData.metrics) {
            const metrics = metricsData.metrics;

            if (metrics.http_reqs) {
                const value = metrics.http_reqs.values ? metrics.http_reqs.values.count || metrics.http_reqs.values.avg || 0 : metrics.http_reqs;
                prometheusMetrics += `k6_http_requests_total{${labels}} ${value}\n`;
            }

            if (metrics.http_req_duration) {
                const duration = metrics.http_req_duration.values ? 
                    (metrics.http_req_duration.values.avg || metrics.http_req_duration.values.med || 0) / 1000 : 
                    metrics.http_req_duration / 1000;
                prometheusMetrics += `k6_http_request_duration_seconds{${labels}} ${duration}\n`;

                if (metrics.http_req_duration.values) {
                    if (metrics.http_req_duration.values.p90) {
                        prometheusMetrics += `k6_http_request_duration_seconds_p90{${labels}} ${metrics.http_req_duration.values.p90 / 1000}\n`;
                    }
                    if (metrics.http_req_duration.values.p95) {
                        prometheusMetrics += `k6_http_request_duration_seconds_p95{${labels}} ${metrics.http_req_duration.values.p95 / 1000}\n`;
                    }
                    if (metrics.http_req_duration.values.p99) {
                        prometheusMetrics += `k6_http_request_duration_seconds_p99{${labels}} ${metrics.http_req_duration.values.p99 / 1000}\n`;
                    }
                }
            }

            if (metrics.http_req_failed) {
                const value = metrics.http_req_failed.values ? 
                    metrics.http_req_failed.values.rate || metrics.http_req_failed.values.avg || 0 : 
                    metrics.http_req_failed;
                prometheusMetrics += `k6_http_request_failures_total{${labels}} ${value}\n`;
            }

            if (metrics.vus) {
                const value = metrics.vus.values ? metrics.vus.values.value || metrics.vus.values.max || 0 : metrics.vus;
                prometheusMetrics += `k6_virtual_users{${labels}} ${value}\n`;
            }

            if (metrics.data_sent) {
                const value = metrics.data_sent.values ? metrics.data_sent.values.count || 0 : metrics.data_sent;
                prometheusMetrics += `k6_data_sent_bytes_total{${labels}} ${value}\n`;
            }

            if (metrics.data_received) {
                const value = metrics.data_received.values ? metrics.data_received.values.count || 0 : metrics.data_received;
                prometheusMetrics += `k6_data_received_bytes_total{${labels}} ${value}\n`;
            }

            if (metrics.iterations) {
                const value = metrics.iterations.values ? metrics.iterations.values.count || 0 : metrics.iterations;
                prometheusMetrics += `k6_iterations_total{${labels}} ${value}\n`;
            }

            if (metrics.k6_experiment_requests) {
                const value = metrics.k6_experiment_requests.values ? metrics.k6_experiment_requests.values.count || 0 : metrics.k6_experiment_requests;
                prometheusMetrics += `k6_experiment_requests_total{${labels}} ${value}\n`;
            }

            if (metrics.k6_experiment_duration) {
                const duration = metrics.k6_experiment_duration.values ? 
                    (metrics.k6_experiment_duration.values.avg || 0) / 1000 : 
                    metrics.k6_experiment_duration / 1000;
                prometheusMetrics += `k6_experiment_duration_seconds{${labels}} ${duration}\n`;
            }
        }

        return prometheusMetrics;
    }

    private async sendToPushgateway(metrics: string, testName: string, userLabel: string, experimentId: string, additionalLabels?: Record<string, string>): Promise<void> {
        try {

            const jobName = 'k6_test';
            const instance = testName.toLowerCase();

            let path = `/metrics/job/${encodeURIComponent(jobName)}/instance/${encodeURIComponent(instance)}`;

            if (additionalLabels) {
                Object.entries(additionalLabels).forEach(([key, value]) => {
                    if (value) {
                        path += `/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;
                    }
                });
            }
            
            path += `/experiment/${encodeURIComponent(experimentId)}/user/${encodeURIComponent(userLabel)}`;

            const url = `${this.pushgatewayUrl}${path}`;
            
            this.logger.log(`Enviando métricas a Pushgateway: ${url}`);
            
            const response = await axios.put(url, metrics, {
                headers: {
                    'Content-Type': 'text/plain; version=0.0.4'
                },
                timeout: 10000
            });
            
            this.logger.log(`Métricas enviadas a Pushgateway exitosamente (status: ${response.status})`);
        } catch (error: any) {
            this.logger.error(`Error enviando métricas a Pushgateway: ${error.message}`);
            if (error.response) {
                this.logger.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
            }
        }
    }

    private async generateAndSaveCSV(metricsData: any, experimentName: string, testName: string, experimentId: string, additionalLabels?: Record<string, string>): Promise<string | null> {
        try {
            if (!metricsData.metrics) {
                this.logger.warn('No metrics data available for CSV generation');
                return null;
            }

            const metrics = metricsData.metrics;
            const csvRows: string[] = [];

            const headers = [
                'timestamp',
                'http_requests_total',
                'http_request_duration_seconds',
                'http_request_duration_p90',
                'http_request_duration_p95',
                'http_request_duration_p99',
                'http_request_failures_total',
                'virtual_users',
                'data_sent_bytes_total',
                'data_received_bytes_total',
                'iterations_total',
                'experiment_requests_total',
                'experiment_duration_seconds'
            ];
            csvRows.push(headers.join(','));

            const getValue = (metric: any, field: string = 'count') => {
                if (!metric) return '0';
                if (metric.values) {
                    return (metric.values[field] || metric.values.avg || metric.values.value || '0').toString();
                }
                return metric.toString();
            };

            const getDurationValue = (metric: any, field: string = 'avg') => {
                if (!metric) return '0';
                if (metric.values) {
                    const value = metric.values[field] || metric.values.med || 0;
                    return (value / 1000).toString(); 
                }
                return (metric / 1000).toString();
            };

            const timestamp = new Date().toISOString();

            const row = [
                timestamp,
                getValue(metrics.http_reqs),
                getDurationValue(metrics.http_req_duration),
                metrics.http_req_duration?.values?.p90 ? (metrics.http_req_duration.values.p90 / 1000).toString() : '0',
                metrics.http_req_duration?.values?.p95 ? (metrics.http_req_duration.values.p95 / 1000).toString() : '0',
                metrics.http_req_duration?.values?.p99 ? (metrics.http_req_duration.values.p99 / 1000).toString() : '0',
                getValue(metrics.http_req_failed, 'rate'),
                getValue(metrics.vus, 'value'),
                getValue(metrics.data_sent),
                getValue(metrics.data_received),
                getValue(metrics.iterations),
                getValue(metrics.k6_experiment_requests),
                getDurationValue(metrics.k6_experiment_duration)
            ];
            csvRows.push(row.join(','));

            const serviceName = additionalLabels?.service || 'unknown';
            const endpoint = additionalLabels?.endpoint || 'unknown';
            const csvFileName = `${testName.toLowerCase()}-${serviceName}-${endpoint}.csv`;

            const formattedExperimentName = experimentName.toLowerCase().replace(/\s+/g, '-');

            const experimentDir = path.join(this.resultsBasePath, formattedExperimentName);
            if (!fs.existsSync(experimentDir)) {
                fs.mkdirSync(experimentDir, { recursive: true });
                this.logger.log(`Directorio creado: ${experimentDir}`);
            }

            const csvPath = path.join(experimentDir, csvFileName);
            fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');
            
            this.logger.log(`✅ CSV generado y guardado: ${csvPath}`);
            this.logger.log(`   Tamaño del archivo: ${fs.statSync(csvPath).size} bytes`);
            return csvFileName;
        } catch (error) {
            this.logger.error(`Error generando CSV: ${error.message}`);
            return null;
        }
    }

    private async updateExperimentoFiles(experimentId: string, csvFileName: string, experimentName: string): Promise<void> {
        try {
            
            let experimentos = await this.experimentoRepo.find({
                where: { experiment_id: experimentId }
            });

            if (experimentos.length === 0) {
                this.logger.warn(`No se encontraron experimentos con experiment_id: ${experimentId}, intentando por nombre: ${experimentName}`);
                experimentos = await this.experimentoRepo.find({
                    where: { nombre: experimentName }
                });
            }

            if (experimentos.length === 0) {
                this.logger.error(`No se encontraron experimentos con experiment_id: ${experimentId} ni con nombre: ${experimentName}`);
                this.logger.error(`El archivo CSV ${csvFileName} fue guardado pero no se pudo asociar a ningún experimento en la BD`);
                return;
            }

            for (const experimento of experimentos) {
                if (!experimento.nombres_archivos) {
                    experimento.nombres_archivos = [];
                }

                if (!experimento.nombres_archivos.includes(csvFileName)) {
                    experimento.nombres_archivos.push(csvFileName);
                    await this.experimentoRepo.save(experimento);
                    this.logger.log(`✅ Archivo ${csvFileName} agregado al experimento ${experimento.id_experimento} (${experimento.nombre})`);
                    this.logger.log(`   Total de archivos: ${experimento.nombres_archivos.length}`);
                } else {
                    this.logger.log(`Archivo ${csvFileName} ya existe en el experimento ${experimento.id_experimento}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error actualizando archivos del experimento: ${error.message}`);
            this.logger.error(`Stack trace: ${error.stack}`);
        }
    }
}
