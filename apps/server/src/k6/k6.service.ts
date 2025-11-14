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
                this.logger.log(`K6 TestRun ${name} not found in namespace ${namespace} - marking as failed`);
                return { notFound: true };
            }
            
            this.logger.warn(`Error getting K6 TestRun status ${name}:`, error.statusCode || error.code || 'Unknown error');
            return null;
        }
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

    async waitForJobCompletion(jobName: string, namespace: string, timeoutMs: number = 600000): Promise<void> {
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
                        
                        const script = this.generateScript({
                            duration: endpoint.duracion || payload.duracion || '30s',
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

    async copyResultsToPVC(testName: string, namespace: string, userLabel: string, experimentId: string): Promise<string> {
        const runnerPodName = `${testName}-runner-0`;
        const sanitizedTestName = testName.replace(/-+$/, '');
        const jobName = `${sanitizedTestName}-copy-job`;

        const copyJob = {
            apiVersion: 'batch/v1',
            kind: 'Job',
            metadata: {
                name: jobName,
                namespace,
                labels: {
                    app: 'k6-copy',
                    test: testName
                }
            },
            spec: {
                ttlSecondsAfterFinished: 300, 
                template: {
                    metadata: {
                        labels: {
                            app: 'k6-copy',
                            test: testName
                        }
                    },
                    spec: {
                        serviceAccountName: 'nest-deployer', 
                        containers: [
                            {
                                name: 'copy',
                                image: 'bitnami/kubectl:latest',
                                command: ['sh', '-c'],
                                args: [`
                                    echo "=== Starting copy job for ${testName} ===" &&
                                    echo "Waiting for pod ${runnerPodName} to exist..." &&
                                    for i in {1..60}; do
                                      if kubectl get pod ${runnerPodName} -n ${namespace} >/dev/null 2>&1; then
                                        echo "Pod ${runnerPodName} found"
                                        break
                                      fi
                                      if [ $i -eq 60 ]; then
                                        echo "⚠️ Pod ${runnerPodName} not found after 60 attempts"
                                        exit 1
                                      fi
                                      sleep 2
                                    done &&
                                    echo "Waiting for pod ${runnerPodName} to be ready..." &&
                                    kubectl wait --for=condition=ready pod/${runnerPodName} -n ${namespace} --timeout=300s || echo "⚠️ Pod not ready, continuing anyway..." &&
                                    echo "Waiting for test to complete (checking TestRun status)..." &&
                                    for i in {1..120}; do
                                      PHASE=$(kubectl get testrun ${testName} -n ${namespace} -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
                                      echo "TestRun phase: $PHASE (attempt $i/120)"
                                      if [ "$PHASE" = "complete" ] || [ "$PHASE" = "Complete" ] || [ "$PHASE" = "COMPLETE" ]; then
                                        echo "TestRun completed"
                                        break
                                      fi
                                      if [ "$PHASE" = "error" ] || [ "$PHASE" = "Error" ] || [ "$PHASE" = "ERROR" ]; then
                                        echo "⚠️ TestRun failed"
                                        break
                                      fi
                                      if [ $i -eq 120 ]; then
                                        echo "⚠️ TestRun did not complete in time, proceeding anyway"
                                        break
                                      fi
                                      sleep 5
                                    done &&
                                    echo "Waiting additional 10 seconds for files to be written..." &&
                                    sleep 10 &&
                                    mkdir -p /test-result/${userLabel}/${experimentId} &&
                                    echo "=== Listing files in pod ${runnerPodName} ===" &&
                                    kubectl exec ${runnerPodName} -n ${namespace} -- ls -la /tmp/ 2>&1 || echo "⚠️ Could not list files in pod" &&
                                    echo "=== Looking for test files ===" &&
                                    kubectl exec ${runnerPodName} -n ${namespace} -- sh -c "ls -la /tmp/*.json 2>/dev/null || echo 'No JSON files found'" &&
                                    echo "=== Copying test results ===" &&
                                    kubectl cp ${namespace}/${runnerPodName}:/tmp /test-result/${userLabel}/${experimentId} --retries=3 || echo "⚠️ Copy failed, continuing..." &&
                                    echo "=== Copy job completed ==="
                                `],
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
                                    claimName: `${sanitizedTestName}-pvc`
                                }
                            }
                        ],
                        restartPolicy: 'Never'
                    }
                }
            }
        };

        try {
            await this.batchV1Api.createNamespacedJob({ namespace, body: copyJob });
            this.logger.log(`Copy job ${jobName} created for test ${testName}`);
            
            await this.waitForJobCompletion(jobName, namespace);
            
            return `/test-result/${userLabel}/${experimentId}`;
        } catch (error) {
            this.logger.error(`Error creating copy job for test ${testName} in namespace ${namespace}`, error);
            throw error;
        }
    }
}
