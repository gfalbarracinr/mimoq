import { Injectable, Logger } from '@nestjs/common';
import { KubeConfig, CoreV1Api, V1Namespace, AppsV1Api, V1Deployment, V1Service, V1PersistentVolumeClaim } from '@kubernetes/client-node';

@Injectable()
export class KubernetesService {
    private readonly logger = new Logger(KubernetesService.name);
    private readonly k8sApi: CoreV1Api;
    private readonly appsApi: AppsV1Api;

    constructor() {
        const config = new KubeConfig()
        config.loadFromCluster()
        this.k8sApi = config.makeApiClient(CoreV1Api)
        this.appsApi = config.makeApiClient(AppsV1Api)
        
    }

    async createPVC(name: string, namespace: string) {
      try {
        const pvc: V1PersistentVolumeClaim = {
            metadata: { name, namespace },
            spec: {
                accessModes: ['ReadWriteOnce'],
                resources: {
                    requests: {
                        storage: '1Gi'
                    }
                }
            }
        }
        await this.k8sApi.createNamespacedPersistentVolumeClaim({ namespace, body: pvc});
      } catch (error) {
        this.logger.error(`Error creando PVC ${name} en namespace ${namespace}`, error)
        throw error
      }
    }

    async createNamespace(name: string) {
         try {
            const namespace: V1Namespace = {
                metadata: { name }
            }
            const response = await this.k8sApi.createNamespace({ body: namespace})
            this.logger.log(`Namespace creado ${name}`)
            console.log(`Namespace creado correctamente ${response}`)
         } catch(error) {
            this.logger.error('Error creando namespace', error)
            throw error
         }
    }
    async deployContainers(namespace: string, containers: any[]) {
        for (const container of containers) {
          const { name, image, port_expose, container_name } = container;
    
          const deployment: V1Deployment = {
            metadata: { name, namespace },
            spec: {
              selector: { matchLabels: { app: name } },
              replicas: 1,
              template: {
                metadata: { labels: { app: name } },
                spec: {
                  containers: [
                    {
                      name: container_name || name,
                      image,
                      ports: [{ containerPort: port_expose }],
                    },
                  ],
                },
              },
            },
          };
    
          const service: V1Service = {
            metadata: { name, namespace },
            spec: {
              selector: { app: name },
              ports: [
                {
                  port: port_expose,
                  targetPort: port_expose,
                },
              ],
              type: 'ClusterIP',
            },
          };
    
          try {
            await this.appsApi.createNamespacedDeployment({ namespace, body: deployment});
            await this.k8sApi.createNamespacedService({ namespace, body: service});
            this.logger.log(`Deployed ${name} (${image}) in namespace ${namespace}`);
          } catch (error) {
            this.logger.error(`Error deploying ${name}`, error.response?.body || error);
            throw error
          }
        }
    }
}
