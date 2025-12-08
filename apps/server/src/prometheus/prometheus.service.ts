import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface PrometheusQueryResult {
  metric: Record<string, string>;
  value?: [number, string]; 
  values?: [number, string][]; 
}

export interface PrometheusQueryResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusQueryResult[];
  };
}

export interface PrometheusQueryRangeParams {
  query: string;
  start: number; 
  end: number; 
  step: string; 
}

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);
  private prometheusUrl: string;
  private axiosInstance: AxiosInstance;

  constructor() {

    this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://kube-prometheus-stack-prometheus:9090';
    
    this.axiosInstance = axios.create({
      baseURL: this.prometheusUrl,
      timeout: 30000, 
      validateStatus: (status) => status < 500, 
    });
  }

  async query(query: string, time?: number): Promise<PrometheusQueryResponse> {
    try {
      const params: any = { query };
      if (time) {
        params.time = time;
      }

      const response = await this.axiosInstance.get('/api/v1/query', { params });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error querying Prometheus: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to query Prometheus: ${error.message}`);
    }
  }

  async queryRange(params: PrometheusQueryRangeParams): Promise<PrometheusQueryResponse> {
    try {
      const response = await this.axiosInstance.get('/api/v1/query_range', {
        params: {
          query: params.query,
          start: params.start,
          end: params.end,
          step: params.step,
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error querying Prometheus range: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to query Prometheus range: ${error.message}`);
    }
  }

  async getK6MetricsForExperiment(
    experimentId: string,
    startTime: Date,
    endTime: Date,
    additionalLabels?: Record<string, string>
  ): Promise<Record<string, PrometheusQueryResult[]>> {
    const start = Math.floor(startTime.getTime() / 1000);
    const end = Math.floor(endTime.getTime() / 1000);
    const step = '15s'; 

    let labelSelector = `experiment="${experimentId}"`;

    this.logger.log(`Consultando métricas de Prometheus para experiment_id: ${experimentId}, rango: ${new Date(start * 1000).toISOString()} - ${new Date(end * 1000).toISOString()}`);

    const metrics: Record<string, PrometheusQueryResult[]> = {};

    const metricQueries = [
      'k6_http_requests_total',
      'k6_http_request_duration_seconds',
      'k6_http_request_duration_seconds_p90',
      'k6_http_request_duration_seconds_p95',
      'k6_http_request_duration_seconds_p99',
      'k6_http_request_failures_total',
      'k6_virtual_users',
      'k6_data_sent_bytes_total',
      'k6_data_received_bytes_total',
      'k6_iterations_total',
      'k6_experiment_requests_total',
      'k6_experiment_duration_seconds',
    ];

    for (const metricName of metricQueries) {
      try {
        const query = `${metricName}{${labelSelector}}`;
        const response = await this.queryRange({
          query,
          start,
          end,
          step,
        });

        if (response.status === 'success' && response.data.result) {
          metrics[metricName] = response.data.result;
        } else {
          this.logger.warn(`No data found for metric ${metricName}`);
          metrics[metricName] = [];
        }
      } catch (error: any) {
        this.logger.warn(`Error querying metric ${metricName}: ${error.message}`);
        metrics[metricName] = [];
      }
    }

    return metrics;
  }

  async getPodCPUMetrics(
    podNames: string[],
    namespace: string,
    startTime: Date,
    endTime: Date
  ): Promise<Record<string, PrometheusQueryResult[]>> {
    const start = Math.floor(startTime.getTime() / 1000);
    const end = Math.floor(endTime.getTime() / 1000);
    const step = '15s';

    const metrics: Record<string, PrometheusQueryResult[]> = {};

    for (const podName of podNames) {
      try {
        const query = `rate(container_cpu_usage_seconds_total{pod="${podName}",namespace="${namespace}",container!="POD"}[5m])`;
        const response = await this.queryRange({
          query,
          start,
          end,
          step,
        });

        if (response.status === 'success' && response.data.result) {
          metrics[`cpu_${podName}`] = response.data.result;
        } else {
          this.logger.warn(`No CPU data found for pod ${podName}`);
          metrics[`cpu_${podName}`] = [];
        }
      } catch (error: any) {
        this.logger.warn(`Error querying CPU for pod ${podName}: ${error.message}`);
        metrics[`cpu_${podName}`] = [];
      }
    }

    return metrics;
  }

  async getPodMemoryMetrics(
    podNames: string[],
    namespace: string,
    startTime: Date,
    endTime: Date
  ): Promise<Record<string, PrometheusQueryResult[]>> {
    const start = Math.floor(startTime.getTime() / 1000);
    const end = Math.floor(endTime.getTime() / 1000);
    const step = '15s';

    const metrics: Record<string, PrometheusQueryResult[]> = {};

    for (const podName of podNames) {
      try {
        
        const query = `container_memory_working_set_bytes{pod="${podName}",namespace="${namespace}",container!="POD"}`;
        const response = await this.queryRange({
          query,
          start,
          end,
          step,
        });

        if (response.status === 'success' && response.data.result) {
          metrics[`memory_${podName}`] = response.data.result;
        } else {
          this.logger.warn(`No memory data found for pod ${podName}`);
          metrics[`memory_${podName}`] = [];
        }
      } catch (error: any) {
        this.logger.warn(`Error querying memory for pod ${podName}: ${error.message}`);
        metrics[`memory_${podName}`] = [];
      }
    }

    return metrics;
  }

  async getPodNetworkMetrics(
    podNames: string[],
    namespace: string,
    startTime: Date,
    endTime: Date
  ): Promise<Record<string, PrometheusQueryResult[]>> {
    const start = Math.floor(startTime.getTime() / 1000);
    const end = Math.floor(endTime.getTime() / 1000);
    const step = '15s';

    const metrics: Record<string, PrometheusQueryResult[]> = {};

    for (const podName of podNames) {
      try {
        
        const receiveQuery = `sum(rate(container_network_receive_bytes_total{pod="${podName}",namespace="${namespace}"}[5m])) by (pod)`;
        const receiveResponse = await this.queryRange({
          query: receiveQuery,
          start,
          end,
          step,
        });

        if (receiveResponse.status === 'success' && receiveResponse.data.result) {
          metrics[`network_receive_${podName}`] = receiveResponse.data.result;
        }

        const transmitQuery = `sum(rate(container_network_transmit_bytes_total{pod="${podName}",namespace="${namespace}"}[5m])) by (pod)`;
        const transmitResponse = await this.queryRange({
          query: transmitQuery,
          start,
          end,
          step,
        });

        if (transmitResponse.status === 'success' && transmitResponse.data.result) {
          metrics[`network_transmit_${podName}`] = transmitResponse.data.result;
        }
      } catch (error: any) {
        this.logger.warn(`Error querying network for pod ${podName}: ${error.message}`);
      }
    }

    return metrics;
  }

  async getHTTPRequestMetrics(
    serviceNames: string[],
    namespace: string,
    startTime: Date,
    endTime: Date
  ): Promise<Record<string, PrometheusQueryResult[]>> {
    const start = Math.floor(startTime.getTime() / 1000);
    const end = Math.floor(endTime.getTime() / 1000);
    const step = '15s';

    const metrics: Record<string, PrometheusQueryResult[]> = {};

    const httpMetrics = [
      'http_requests_total',
      'nginx_http_requests_total',
      'istio_requests_total',
      'envoy_http_downstream_rq_total',
    ];

    for (const serviceName of serviceNames) {
      for (const metricName of httpMetrics) {
        try {
          
          const queries = [
            `${metricName}{service="${serviceName}",namespace="${namespace}"}`,
            `${metricName}{pod=~".*${serviceName}.*",namespace="${namespace}"}`,
            `${metricName}{job="${serviceName}"}`,
          ];

          for (const query of queries) {
            try {
              const response = await this.queryRange({
                query,
                start,
                end,
                step,
              });

              if (response.status === 'success' && response.data.result && response.data.result.length > 0) {
                metrics[`http_requests_${serviceName}`] = response.data.result;
                this.logger.log(`Found HTTP metrics for ${serviceName} using ${metricName}`);
                break; 
              }
            } catch (e) {
              
            }
          }
        } catch (error: any) {
          
        }
      }
    }

    return metrics;
  }

  async getHTTPStatusMetrics(
    serviceNames: string[],
    namespace: string,
    startTime: Date,
    endTime: Date
  ): Promise<Record<string, PrometheusQueryResult[]>> {
    const start = Math.floor(startTime.getTime() / 1000);
    const end = Math.floor(endTime.getTime() / 1000);
    const step = '15s';

    const metrics: Record<string, PrometheusQueryResult[]> = {};
    
    // Status codes comunes a consultar
    const statusCodes = ['200', '201', '400', '401', '403', '404', '500', '502', '503', '504'];

    for (const serviceName of serviceNames) {
      for (const statusCode of statusCodes) {
        try {
          // Consultar métricas de k6 con label de status_code
          // k6 expone métricas con el label status_code en k6_http_requests_total
          const queries = [
            `sum(rate(k6_http_requests_total{status_code="${statusCode}"}[15s])) by (status_code)`,
            `sum(rate(k6_http_requests_total{status="${statusCode}"}[15s])) by (status)`,
            `sum(rate(k6_http_requests_total{status_code="${statusCode}",service="${serviceName}"}[15s]))`,
            `sum(rate(k6_http_requests_total{status_code="${statusCode}",namespace="${namespace}"}[15s]))`,
          ];

          for (const query of queries) {
            try {
              const response = await this.queryRange({
                query,
                start,
                end,
                step,
              });

              if (response.status === 'success' && response.data.result && response.data.result.length > 0) {
                const metricKey = `http_status_${statusCode}_${serviceName}`;
                metrics[metricKey] = response.data.result;
                this.logger.log(`Found HTTP status ${statusCode} metrics for ${serviceName}`);
                break;
              }
            } catch (e) {
              // Continuar con siguiente query
            }
          }
        } catch (error: any) {
          // Continuar con siguiente status code
        }
      }
    }

    return metrics;
  }

  async getHTTPLatencyMetrics(
    serviceNames: string[],
    namespace: string,
    startTime: Date,
    endTime: Date
  ): Promise<Record<string, PrometheusQueryResult[]>> {
    const start = Math.floor(startTime.getTime() / 1000);
    const end = Math.floor(endTime.getTime() / 1000);
    const step = '15s';

    const metrics: Record<string, PrometheusQueryResult[]> = {};

    const latencyMetrics = [
      'http_request_duration_seconds',
      'nginx_http_request_duration_seconds',
      'istio_request_duration_milliseconds',
      'envoy_http_downstream_rq_time',
    ];

    for (const serviceName of serviceNames) {
      for (const metricName of latencyMetrics) {
        try {
          const queries = [
            `${metricName}{service="${serviceName}",namespace="${namespace}"}`,
            `${metricName}{pod=~".*${serviceName}.*",namespace="${namespace}"}`,
            `avg(${metricName}{job="${serviceName}"})`,
          ];

          for (const query of queries) {
            try {
              const response = await this.queryRange({
                query,
                start,
                end,
                step,
              });

              if (response.status === 'success' && response.data.result && response.data.result.length > 0) {
                metrics[`latency_${serviceName}`] = response.data.result;
                this.logger.log(`Found latency metrics for ${serviceName} using ${metricName}`);
                break;
              }
            } catch (e) {
              
            }
          }
        } catch (error: any) {
          
        }
      }
    }

    return metrics;
  }

  async findPodNames(serviceName: string, namespace: string): Promise<string[]> {
    try {

      const query = `kube_pod_info{namespace="${namespace}"}`;
      const response = await this.query(query);

      if (response.status === 'success' && response.data.result) {
        const podNames: string[] = [];
        for (const result of response.data.result) {
          const podName = result.metric.pod;
          
          if (podName && podName.includes(serviceName)) {
            podNames.push(podName);
          }
        }
        return podNames;
      }
    } catch (error: any) {
      this.logger.warn(`Error finding pods for service ${serviceName}: ${error.message}`);
    }

    return [];
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/api/v1/status/config', { timeout: 5000 });
      return response.status === 200;
    } catch (error: any) {
      this.logger.warn(`Prometheus no está disponible en ${this.prometheusUrl}: ${error.message}`);
      
      if (!process.env.PROMETHEUS_URL) {
        const alternatives = [
          'http://prometheus-operated:9090',
          'http://prometheus:9090',
          'http://kube-prometheus-stack-prometheus.default.svc.cluster.local:9090',
        ];
        
        for (const altUrl of alternatives) {
          try {
            const altAxios = axios.create({ baseURL: altUrl, timeout: 5000 });
            const response = await altAxios.get('/api/v1/status/config');
            if (response.status === 200) {
              this.prometheusUrl = altUrl;
              this.axiosInstance = axios.create({
                baseURL: this.prometheusUrl,
                timeout: 30000,
                validateStatus: (status) => status < 500,
              });
              this.logger.log(`Prometheus encontrado en: ${altUrl}`);
              return true;
            }
          } catch (e) {
            
          }
        }
      }
      return false;
    }
  }
}

