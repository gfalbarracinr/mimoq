import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import axios from 'axios';

@Injectable()
export class MetricsProcessorService {
    private readonly logger = new Logger(MetricsProcessorService.name);

    async processK6Metrics(userLabel: string, experimentId: string, testName: string) {
        try {
            const metricsPath = `/test-result/${userLabel}/${experimentId}/metrics-${testName.toLowerCase()}.json`;
            const summaryPath = `/test-result/${userLabel}/${experimentId}/summary-${testName.toLowerCase()}.json`;
            
            // Intentar con summary primero, luego metrics
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
            const prometheusMetrics = this.convertToPrometheusFormat(metricsData, userLabel, experimentId, testName);
            
            // Enviar métricas a Prometheus
            await this.sendToPrometheus(prometheusMetrics);
            
            this.logger.log(`Métricas procesadas para ${testName}`);
        } catch (error) {
            this.logger.error(`Error procesando métricas: ${error.message}`);
        }
    }

    private convertToPrometheusFormat(metricsData: any, userLabel: string, experimentId: string, testName: string): string {
        const labels = `user="${userLabel}",experiment="${experimentId}",test="${testName}"`;
        let prometheusMetrics = '';

        // Métricas estándar de K6
        if (metricsData.metrics) {
            const metrics = metricsData.metrics;
            
            // HTTP requests
            if (metrics.http_reqs) {
                prometheusMetrics += `k6_http_requests_total{${labels}} ${metrics.http_reqs}\n`;
            }
            
            // HTTP request duration
            if (metrics.http_req_duration) {
                prometheusMetrics += `k6_http_request_duration_seconds{${labels}} ${metrics.http_req_duration / 1000}\n`;
            }
            
            // HTTP request failures
            if (metrics.http_req_failed) {
                prometheusMetrics += `k6_http_request_failures_total{${labels}} ${metrics.http_req_failed}\n`;
            }
            
            // Virtual users
            if (metrics.vus) {
                prometheusMetrics += `k6_virtual_users{${labels}} ${metrics.vus}\n`;
            }
        }

        return prometheusMetrics;
    }

    private async sendToPrometheus(metrics: string): Promise<void> {
        try {
            const response = await axios.post('http://centralized-metrics-service:9090/api/v1/write', metrics, {
                headers: {
                    'Content-Type': 'text/plain'
                }
            });
            
            this.logger.log('Métricas enviadas a Prometheus exitosamente');
        } catch (error) {
            this.logger.error(`Error enviando métricas a Prometheus: ${error.message}`);
        }
    }
}
