import { CoreV1Api, CustomObjectsApi, KubeConfig, BatchV1Api } from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { MetricsProcessorService } from './metrics-processor.service';
import { KubernetesService } from '../kubernetes/kubernetes.service';

@Injectable()
export class K6Service {
    private readonly logger = new Logger(K6Service.name);
    private readonly coreV1Api: CoreV1Api;
    private readonly customApi: CustomObjectsApi;
    private readonly batchV1Api: BatchV1Api;

    constructor(private metricsProcessor: MetricsProcessorService, private kubernetesService: KubernetesService) {
        const config = new KubeConfig();
        config.loadFromCluster();
        this.coreV1Api = config.makeApiClient(CoreV1Api);
        this.customApi = config.makeApiClient(CustomObjectsApi);
        this.batchV1Api = config.makeApiClient(BatchV1Api);
    }

    private generateUrlLabel(url: string) {
        if (url === '/') {
            return 'root';
        } else {
            return url.slice(1);
        }
    }
    private generateScript(params: {
        duration: string;
        vus: number;
        method: string;
        serviceName: string;
        port: number;
        url: string;
        stages: any[];
        thresholds: object;
        testName: string;
        user: string;
        experiment: string;
    }): string {
        const template = fs.readFileSync(path.join(__dirname, 'template.txt'), 'utf8');

        const stagesString =  params.stages.length > 0 ? `stages: ${JSON.stringify(params.stages, null, 4)},` : '';
        const duration = params.stages.length === 0 ? `duration: '${params.duration}',` : '';
        const vus = params.stages.length === 0 ? `vus: ${params.vus},` : '';
        const urlLabel = this.generateUrlLabel(params.url);
        return template
            .replace(/\${duration}/g, duration)
            .replace(/\${vus}/g, vus)
            .replace(/\${method}/g, params.method.toLowerCase())
            .replace(/\${serviceName}/g, params.serviceName)
            .replace(/\${port}/g, params.port.toString())
            .replace(/\${url}/g, params.url)
            .replace(/\${stages}/g, stagesString)
            .replace(/\${thresholds}/g, this.formatThresholds(params.thresholds) || '{},')
            .replace(/\${testName}/g, params.testName)
            .replace(/\${user}/g, params.user)
            .replace(/\${experiment}/g, params.experiment)
            .replace(/\${urlLabel}/g, urlLabel);
    }
    
    private sanitizeThresholds(thresholdStr: string) {
    
        if (!thresholdStr) return {};

        try {
            const clean = thresholdStr.trim();

            const parsed = Function('"use strict";return (' + clean + ')')();

            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            } else {
                this.logger.warn('El threshold no es un objeto válido.');
                throw new Error('El threshold no es un objeto válido.');
            }
        } catch (error) {
                this.logger.error('Error al parsear threshold:', error);
                return {};
        }

    }

    private formatThresholds(thresholds: object): string {
        try {
            // Convierte el objeto JS en una representación literal JS (sin comillas)
            const entries = Object.entries(thresholds).map(
                ([key, value]) => `    ${key}: ${JSON.stringify(value)}`
            );
            return `{\n${entries.join(',\n')}\n}`;
        } catch {
            return '{}';
        }
    }

    private getStages(endpoint: any, payload: any) {
        const { duracion, vus } = endpoint;
        const { rampUpStages, coolDownDuration, coolDownTarget, enableCoolDown, enableRampUp } = payload;
        const stages = [];
        if (enableRampUp) {
            stages.push(...rampUpStages.map(stage => ({ duration: stage.duration, target: stage.target })));
        }
        stages.push({ duration: duracion, target: vus });

        if (enableCoolDown) {
            stages.push({ duration: coolDownDuration, target: coolDownTarget });
        }
        return stages;
    }

    async createPVC(name: string, namespace: string) {
        await this.kubernetesService.createPVC(`${name}-pvc`, namespace);
    }

    private parseDurationToMs(duration: string): number {
        // Parsear duración como "30s", "2m", "1h", etc.
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) {
            this.logger.warn(`Duración inválida: ${duration}, usando 30s por defecto`);
            return 30000; // 30 segundos por defecto
        }
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 30000;
        }
    }

    async copyResultsToPVC(testName: string, namespace: string, userLabel: string, experimentId: string) {
        try {
            // Crear un Job para copiar archivos
            const copyJob = {
                apiVersion: 'batch/v1',
                kind: 'Job',
                metadata: {
                    name: `${testName}-copy-job`,
                    namespace,
                    labels: {
                        app: 'k6-copy',
                        test: testName
                    }
                },
                spec: {
                    ttlSecondsAfterFinished: 300, // Limpiar Job después de 5 minutos
                    template: {
                        metadata: {
                            labels: {
                                app: 'k6-copy',
                                test: testName
                            }
                        },
                        spec: {
                            containers: [
                                {
                                    name: 'copy',
                                    image: 'bitnami/kubectl:latest',
                                    command: ['sh', '-c'],
                                    args: [`
                                        mkdir -p /test-result/${userLabel}/${experimentId} &&
                                        kubectl cp ${testName}-runner-0:/tmp/output-${testName}.json /test-result/${userLabel}/${experimentId}/output-${testName}.json &&
                                        kubectl cp ${testName}-runner-0:/tmp/metrics-${testName}.json /test-result/${userLabel}/${experimentId}/metrics-${testName}.json &&
                                        echo "✅ Files copied to shared PVC"
                                        `
                                    ],
                                    volumeMounts: [
                                        {
                                            name: 'test-result',
                                            mountPath: '/test-result'
                                        }
                                    ]
                                }
                            ],
                            volumes: [
                                {
                                    name: 'test-result',
                                    persistentVolumeClaim: {
                                        claimName: `${testName}-pvc`
                                    }
                                }
                            ],
                            restartPolicy: 'Never'
                        }
                    }
                }
            };

            await this.batchV1Api.createNamespacedJob({
                namespace,
                body: copyJob
            });

            this.logger.log(`Job de copia creado para ${testName}`);
        } catch (error) {
            this.logger.error(`Error copiando resultados para ${testName}:`, error);
            throw error;
        }
    }

    async createExperiment(payload: any, userId?: string) {
        const { nombre, replicas, duracion, servicios } = payload;
        const experimentId = `exp-${Date.now()}`;
        const userLabel = userId ? `user-${userId}` : 'anonymous';
        for (const servicio of servicios) {
            console.log('servicio', servicio);
            console.log('nombre', nombre);
            console.log('payload', payload);
            const namespace = servicio.namespace;
            const serviceName = servicio.nombre;

            for( const endpoint of servicio.endpoints) {
                const testName = `${nombre}-${serviceName}-${endpoint.url.replace(/\W+/g, '-')}`;
                const thresholds = endpoint.thresholds ? this.sanitizeThresholds(endpoint.thresholds) : {};
                const script = this.generateScript({
                    duration: endpoint.duracion || duracion,
                    vus: endpoint.vus,
                    method: endpoint.metodo,
                    serviceName,
                    port: servicio.puerto,
                    url: endpoint.url,
                    stages: this.getStages(endpoint, payload),
                    thresholds,
                    testName: testName,
                    user: userLabel,
                    experiment: experimentId
                });
                // Crear PVC en el mismo namespace del pod
                await this.createPVC(testName.toLowerCase().slice(0, 60), namespace);
                const k6Test = {
                    apiVersion: 'k6.io/v1alpha1',
                    kind: 'TestRun',
                    metadata: {
                        name: testName.toLowerCase(),
                        namespace,
                        labels: {
                            app: 'k6-tests',
                            test: testName.toLowerCase(),
                            experiment: experimentId,
                            user: userLabel,
                            service: serviceName,
                            endpoint: this.generateUrlLabel(endpoint.url)
                        },
                        annotations: {
                            'prometheus.io/scrape': 'true',
                            'prometheus.io/port': '9090',
                            'prometheus.io/path': '/metrics'
                        }
                    },
                    spec: {
                        parallelism: replicas,
                        script: {
                            configMap: {
                                name: `${testName.toLowerCase()}-script`,
                                file: 'test.js',
                            },
                        },
                        arguments: `--summary-export=/tmp/output-${testName.toLowerCase()}.json --out json=/tmp/metrics-${testName.toLowerCase()}.json`,
                        ports: [
                            {
                                name: 'metrics',
                                containerPort: 9090,
                                protocol: 'TCP'
                            }
                        ]
                    },
                };
                const configMap = {
                    apiVersion: 'v1',
                    kind: 'ConfigMap',
                    metadata: {
                        name: `${testName.toLowerCase()}-script`,
                        namespace,
                    },
                    data: {
                        'test.js': script,
                    },
                };

                const k6Service = {
                    apiVersion: 'v1',
                    kind: 'Service',
                    metadata: {
                        name: `${testName.toLowerCase()}-metrics`,
                        namespace,
                        labels: {
                            app: 'k6-tests',
                            test: testName.toLowerCase(),
                            experiment: experimentId,
                            user: userLabel
                        }
                    },
                    spec: {
                        selector: {
                            app: 'k6-tests',
                            test: testName.toLowerCase()
                        },
                        ports: [
                            {
                                name: 'metrics',
                                port: 9090,
                                targetPort: 9090,
                                protocol: 'TCP'
                            }
                        ]
                    }
                };

                try {
                    await this.coreV1Api.createNamespacedConfigMap({
                        namespace,
                        body: configMap,
                    });
                    await this.coreV1Api.createNamespacedService({
                        namespace,
                        body: k6Service,
                    });
                    console.log('namespace', namespace);
                    console.log('configmap ', configMap)
                    await this.customApi.createNamespacedCustomObject({
                        group: 'k6.io',
                        version: 'v1alpha1',
                        namespace,
                        plural: 'testruns',
                        body: k6Test,
                    });
                    this.logger.log(`K6Test creado ${testName} en namespace ${namespace} con métricas en puerto 9090`);
                    
                    // Calcular duración del test en milisegundos
                    const testDurationMs = this.parseDurationToMs(duracion);
                    const delayMs = testDurationMs + 10000; // 10 segundos adicionales para asegurar que termine
                    
                    this.logger.log(`Test ${testName} durará ${duracion}, procesando resultados en ${delayMs/1000} segundos`);
                    
                    // Programar procesamiento de métricas después de que termine el test
                    setTimeout(async () => {
                        try {
                            // Copiar resultados del pod al PVC
                            await this.copyResultsToPVC(testName.toLowerCase(), namespace, userLabel, experimentId);
                            // Procesar métricas
                            await this.metricsProcessor.processK6Metrics(userLabel, experimentId, testName);
                        } catch (error) {
                            this.logger.error(`Error procesando métricas para ${testName}:`, error);
                        }
                    }, delayMs);
                    
                } catch (error) {
                    this.logger.error(`Error creando K6Test ${testName} en namespace ${namespace}`, error);
                    throw error;
                }
            }
        }
    }
}
