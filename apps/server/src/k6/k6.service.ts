import { CoreV1Api, CustomObjectsApi, KubeConfig, BatchV1Api } from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { MetricsProcessorService } from './metrics-processor.service';
import { KubernetesService } from '../kubernetes/kubernetes.service';

@Injectable()
export class K6Service {
    private readonly logger = new Logger(K6Service.name);
    readonly coreV1Api: CoreV1Api;
    readonly customApi: CustomObjectsApi;
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
            
            const entries = Object.entries(thresholds).map(
                ([key, value]) => `    ${key}: ${JSON.stringify(value)}`
            );
            return `{\n${entries.join(',\n')}\n}`;
        } catch {
            return '{}';
        }
    }

    private getStages(endpoint: any, payload: any) {
        // Usar duracion del endpoint o del payload como fallback
        const duracion = endpoint.duracion || payload.duracion || '30s';
        const vus = endpoint.vus || payload.vus || 1;
        const { rampUpStages, coolDownDuration, coolDownTarget, enableCoolDown, enableRampUp } = endpoint;
        const stages = [];
        
        // Si no hay rampUp ni coolDown, retornar array vacío para usar duration directamente
        if (!enableRampUp && !enableCoolDown) {
            return [];
        }
        
        if (enableRampUp && rampUpStages && Array.isArray(rampUpStages) && rampUpStages.length > 0) {
            stages.push(...rampUpStages.map(stage => ({ duration: stage.duration, target: stage.target })));
        }
        
        // Agregar el stage principal con la duración (del endpoint o payload)
        stages.push({ duration: duracion, target: vus });

        if (enableCoolDown && coolDownDuration) {
            stages.push({ duration: coolDownDuration, target: coolDownTarget || 0 });
        }
        
        return stages;
    }

    async createPVC(name: string, namespace: string) {
        
        const cleanName = name.replace(/-+$/, '');
        await this.kubernetesService.createPVC(`${cleanName}-pvc`, namespace);
    }

    async getTestRunStatus(name: string, namespace: string): Promise<any> {
        try {
            const result = await this.customApi.getNamespacedCustomObject({
                group: 'k6.io',
                version: 'v1alpha1',
                namespace,
                plural: 'testruns',
                name: name.toLowerCase(),
            });
            return result.body;
        } catch (error: any) {

            if (error.statusCode === 404 || (error.body && error.body.code === 404)) {
                // No loguear como warning si es 404 - es esperado que algunos TestRuns no existan
                return { notFound: true };
            }
            
            this.logger.warn(`Error getting K6 TestRun status ${name}:`, error.statusCode || error.code || 'Unknown error');
            return null;
        }
    }

    async waitForTestRunCompletion(testRunName: string, namespace: string, timeoutMs: number = 1200000): Promise<void> {
        const startTime = Date.now();
        const checkInterval = 10000; // Verificar cada 10 segundos
        
        this.logger.log(`Iniciando espera para TestRun ${testRunName} (timeout: ${timeoutMs}ms)`);
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const testRun = await this.getTestRunStatus(testRunName, namespace);
                
                if (testRun && testRun.notFound) {
                    this.logger.warn(`TestRun ${testRunName} not found, esperando...`);
                    await new Promise(resolve => setTimeout(resolve, checkInterval));
                    continue;
                }
                
                if (testRun && testRun.status) {
                    const phase = testRun.status.phase || testRun.status.stage || 'Unknown';
                    this.logger.log(`TestRun ${testRunName} status: ${phase}`);
                    
                    if (phase === 'complete' || phase === 'Complete' || phase === 'COMPLETE') {
                        this.logger.log(`TestRun ${testRunName} completado exitosamente`);
                        return;
                    }
                    
                    if (phase === 'error' || phase === 'Error' || phase === 'ERROR' || phase === 'failed' || phase === 'Failed') {
                        const message = testRun.status.message || 'Unknown error';
                        this.logger.error(`TestRun ${testRunName} falló: ${message}`);
                        throw new Error(`TestRun ${testRunName} failed: ${message}`);
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            } catch (error: any) {
                if (error.message && error.message.includes('failed')) {
                    throw error;
                }
                // Si es un error de conexión, continuar esperando
                this.logger.warn(`Error verificando TestRun ${testRunName}, reintentando...: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
        }
        
        throw new Error(`TestRun ${testRunName} no completó dentro del timeout de ${timeoutMs}ms`);
    }

    private parseDurationToMs(duration: string): number {
        
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) {
            this.logger.warn(`Duración inválida: ${duration}, usando 30s por defecto`);
            return 30000;
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

    private parseDurationToSeconds(duration: string): number {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) {
            this.logger.warn(`Duración inválida: ${duration}, usando 30s por defecto`);
            return 30;
        }
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            default: return 30;
        }
    }

    async waitForJobCompletion(jobName: string, namespace: string, timeoutMs: number = 1200000): Promise<void> {
        const startTime = Date.now();
        const checkInterval = 5000; 
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const job = await this.batchV1Api.readNamespacedJob({ name: jobName, namespace });
                const conditions = job.status?.conditions || [];
                const succeeded = conditions.find((c: any) => c.type === 'Complete' && c.status === 'True');
                const failed = conditions.find((c: any) => c.type === 'Failed' && c.status === 'True');
                
                if (succeeded) {
                    this.logger.log(`Job ${jobName} completed successfully`);
                    return;
                }
                
                if (failed) {
                    this.logger.warn(`Job ${jobName} failed: ${failed.message || 'Unknown error'}`);
                    throw new Error(`Job ${jobName} failed: ${failed.message || 'Unknown error'}`);
                }

                await new Promise(resolve => setTimeout(resolve, checkInterval));
            } catch (error: any) {
                if (error.statusCode === 404 || error.response?.statusCode === 404) {
                    
                    await new Promise(resolve => setTimeout(resolve, checkInterval));
                    continue;
                }
                throw error;
            }
        }
        
        throw new Error(`Job ${jobName} did not complete within ${timeoutMs}ms`);
    }

    async createExperiment(payload: any, userLabel: string | undefined, experimentId: string): Promise<any> {
        const createdTests = [];
        const finalExperimentId = experimentId || `exp-${Date.now()}`;
        const user = userLabel || 'default';

        try {
            if (!payload.servicios || !Array.isArray(payload.servicios)) {
                throw new Error('Payload must contain a servicios array');
            }

            for (const servicio of payload.servicios) {
                const serviceName = servicio.nombre || servicio.name;
                const namespace = servicio.namespace || 'default';
                const port = servicio.puerto || servicio.port || 80;

                if (!servicio.endpoints || !Array.isArray(servicio.endpoints)) {
                    this.logger.warn(`No endpoints found for service ${serviceName}, skipping`);
                    continue;
                }

                for (const endpoint of servicio.endpoints) {
                    const testName = `${finalExperimentId}-${serviceName}-${this.generateUrlLabel(endpoint.url || endpoint.endpoint || '/')}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                    const sanitizedTestName = testName.replace(/-+$/, '');

                    try {
                        // Create PVC for storing results
                        await this.createPVC(sanitizedTestName, namespace);

                        // Generate script
                        const stages = this.getStages(endpoint, payload);
                        const thresholds = endpoint.thresholds ? this.sanitizeThresholds(endpoint.thresholds) : {};
                        
                        // Obtener duración correcta (endpoint tiene prioridad, luego payload)
                        const scriptDuration = endpoint.duracion || payload.duracion || '30s';
                        this.logger.log(`Generando script para test ${testName} con duración: ${scriptDuration}, stages: ${JSON.stringify(stages)}`);
                        
                        const script = this.generateScript({
                            duration: scriptDuration,
                            vus: endpoint.vus || payload.vus || 1,
                            method: endpoint.method || 'GET',
                            serviceName: serviceName,
                            port: port,
                            url: endpoint.url || endpoint.endpoint || '/',
                            stages: stages,
                            thresholds: thresholds,
                            testName: testName,
                            user: user,
                            experiment: finalExperimentId,
                        });
                        
                        // Log del script generado para debugging
                        this.logger.log(`Script generado para ${testName} (primeras 500 chars): ${script.substring(0, 500)}`);

                        // Create ConfigMap with script
                        const configMapName = `${sanitizedTestName}-script`;
                        const configMap = {
                            apiVersion: 'v1',
                            kind: 'ConfigMap',
                            metadata: {
                                name: configMapName,
                                namespace: namespace,
                            },
                            data: {
                                'script.js': script,
                            },
                        };

                        try {
                            await this.coreV1Api.createNamespacedConfigMap({ namespace, body: configMap });
                            this.logger.log(`ConfigMap ${configMapName} created`);
                        } catch (error: any) {
                            if (error.statusCode === 409) {
                                // ConfigMap already exists, update it
                                await this.coreV1Api.replaceNamespacedConfigMap({
                                    name: configMapName,
                                    namespace,
                                    body: configMap,
                                });
                                this.logger.log(`ConfigMap ${configMapName} updated`);
                            } else {
                                throw error;
                            }
                        }

                        // Calcular timeout basado en la duración del test
                        const runDuration = endpoint.duracion || payload.duracion || '30s';
                        const durationInSeconds = this.parseDurationToSeconds(runDuration);
                        // Agregar 5 minutos de margen para setup, teardown, etc.
                        const activeDeadlineSeconds = durationInSeconds + 300;
                        
                        this.logger.log(`Creando TestRun ${sanitizedTestName} con duración: ${runDuration} (${durationInSeconds}s), activeDeadlineSeconds: ${activeDeadlineSeconds}s`);
                        
                        // Create K6 TestRun
                        const testRun = {
                            apiVersion: 'k6.io/v1alpha1',
                            kind: 'TestRun',
                            metadata: {
                                name: sanitizedTestName,
                                namespace: namespace,
                                labels: {
                                    experiment: finalExperimentId,
                                    service: serviceName,
                                    user: user,
                                },
                            },
                            spec: {
                                parallelism: 1,
                                script: {
                                    configMap: {
                                        name: configMapName,
                                        file: 'script.js',
                                    },
                                },
                                arguments: '--out json=/tmp/results.json',
                                activeDeadlineSeconds: activeDeadlineSeconds,
                            },
                        };

                        await this.customApi.createNamespacedCustomObject({
                            group: 'k6.io',
                            version: 'v1alpha1',
                            namespace: namespace,
                            plural: 'testruns',
                            body: testRun,
                        });

                        this.logger.log(`K6 TestRun ${sanitizedTestName} created in namespace ${namespace}`);

                        createdTests.push({
                            name: testName,
                            servicio: serviceName,
                            namespace: namespace,
                            endpoint: endpoint.url || endpoint.endpoint || '/',
                            replicas: payload.replicas || 1,
                            testRunName: sanitizedTestName,
                        });
                    } catch (error: any) {
                        this.logger.error(`Error creating K6 test for service ${serviceName}, endpoint ${endpoint.url || endpoint.endpoint}:`, error);
                        // Continue with other tests even if one fails
                    }
                }
            }

            return {
                experimentId: finalExperimentId,
                tests: createdTests,
            };
        } catch (error) {
            this.logger.error(`Error creating K6 experiment ${finalExperimentId}:`, error);
            throw error;
        }
    }

}
