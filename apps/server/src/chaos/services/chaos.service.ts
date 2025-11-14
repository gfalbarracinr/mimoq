import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CustomObjectsApi, KubeConfig, ApiextensionsV1Api } from '@kubernetes/client-node';
import { CreateChaosExperimentDto, ChaosType, ChaosMode, ChaosExperimentScheduleDto } from '../dtos/chaos.dto';

@Injectable()
export class ChaosService {
  private readonly logger = new Logger(ChaosService.name);
  private readonly customApi: CustomObjectsApi;
  private readonly apiExtensionsApi: ApiextensionsV1Api;
  private readonly chaosGroup = 'chaos-mesh.org';
  private readonly chaosVersion = 'v1alpha1';

  constructor() {
    const config = new KubeConfig();
    config.loadFromCluster();
    this.customApi = config.makeApiClient(CustomObjectsApi);
    this.apiExtensionsApi = config.makeApiClient(ApiextensionsV1Api);
  }

  async createChaosExperiment(dto: CreateChaosExperimentDto): Promise<any> {
    const experimentName = dto.name || `chaos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      let chaosResource: any;

      switch (dto.type) {
        case ChaosType.POD_FAILURE:
          chaosResource = this.createPodChaos(experimentName, dto, 'pod-failure');
          break;
        case ChaosType.POD_KILL:
          chaosResource = this.createPodChaos(experimentName, dto, 'pod-kill');
          break;
        case ChaosType.CONTAINER_KILL:
          chaosResource = this.createPodChaos(experimentName, dto, 'container-kill');
          break;
        case ChaosType.NETWORK_DELAY:
          chaosResource = this.createNetworkChaos(experimentName, dto, 'delay');
          break;
        case ChaosType.NETWORK_LOSS:
          chaosResource = this.createNetworkChaos(experimentName, dto, 'loss');
          break;
        case ChaosType.NETWORK_BANDWIDTH:
          chaosResource = this.createNetworkChaos(experimentName, dto, 'bandwidth');
          break;
        case ChaosType.NETWORK_PARTITION:
          chaosResource = this.createNetworkChaos(experimentName, dto, 'partition');
          break;
        case ChaosType.CPU_STRESS:
          chaosResource = this.createStressChaos(experimentName, dto, 'cpu');
          break;
        case ChaosType.MEMORY_STRESS:
          chaosResource = this.createStressChaos(experimentName, dto, 'memory');
          break;
        case ChaosType.IO_STRESS:
          chaosResource = this.createStressChaos(experimentName, dto, 'io');
          break;
        default:
          throw new BadRequestException(`Unsupported chaos type: ${dto.type}`);
      }

      const plural = this.getPluralName(dto.type);

      this.logger.log(`Creating Chaos Mesh experiment:`, {
        name: experimentName,
        type: dto.type,
        namespace: dto.namespace,
        group: this.chaosGroup,
        version: this.chaosVersion,
        plural: plural,
        resource: JSON.stringify(chaosResource, null, 2)
      });

      await this.verifyCRDExists(plural);

      const result = await this.customApi.createNamespacedCustomObject({
        group: this.chaosGroup,
        version: this.chaosVersion,
        namespace: dto.namespace,
        plural: plural,
        body: chaosResource,
      });

      this.logger.log(`✅ Chaos experiment ${experimentName} created successfully in namespace ${dto.namespace}`);
      return { name: experimentName, namespace: dto.namespace, type: dto.type, result };
    } catch (error) {
      const errorDetails = {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response?.body,
        body: error.body,
        requestDetails: {
          group: this.chaosGroup,
          version: this.chaosVersion,
          namespace: dto.namespace,
          plural: this.getPluralName(dto.type),
          experimentName: experimentName,
          type: dto.type
        }
      };
      
      this.logger.error(`❌ Error creating chaos experiment ${experimentName}:`, JSON.stringify(errorDetails, null, 2));

      if (error.statusCode === 404) {
        throw new BadRequestException(
          `Chaos Mesh CRD not found. Please ensure Chaos Mesh is installed. ` +
          `Run: make setup-chaos-mesh\n` +
          `Details: Group=${this.chaosGroup}, Version=${this.chaosVersion}, Plural=${this.getPluralName(dto.type)}, Namespace=${dto.namespace}`
        );
      }
      
      throw new BadRequestException(
        `Failed to create chaos experiment: ${error.message}\n` +
        `Request: ${JSON.stringify(errorDetails.requestDetails, null, 2)}`
      );
    }
  }

  async deleteChaosExperiment(type: ChaosType, namespace: string, name: string): Promise<void> {
    try {
      await this.customApi.deleteNamespacedCustomObject({
        group: this.chaosGroup,
        version: this.chaosVersion,
        namespace,
        plural: this.getPluralName(type),
        name,
      });
      this.logger.log(`Chaos experiment ${name} deleted from namespace ${namespace}`);
    } catch (error) {
      this.logger.error(`Error deleting chaos experiment ${name}:`, error);
      throw new BadRequestException(`Failed to delete chaos experiment: ${error.message}`);
    }
  }

  async getChaosExperimentStatus(type: ChaosType, namespace: string, name: string): Promise<any> {
    try {
      const result = await this.customApi.getNamespacedCustomObject({
        group: this.chaosGroup,
        version: this.chaosVersion,
        namespace,
        plural: this.getPluralName(type),
        name,
      });
      return result.body;
    } catch (error) {
      this.logger.error(`Error getting chaos experiment status ${name}:`, error);
      throw new BadRequestException(`Failed to get chaos experiment status: ${error.message}`);
    }
  }

  async listChaosExperiments(type: ChaosType, namespace: string): Promise<any> {
    try {
      const result = await this.customApi.listNamespacedCustomObject({
        group: this.chaosGroup,
        version: this.chaosVersion,
        namespace,
        plural: this.getPluralName(type),
      });
      return result.body;
    } catch (error) {
      this.logger.error(`Error listing chaos experiments in namespace ${namespace}:`, error);
      throw new BadRequestException(`Failed to list chaos experiments: ${error.message}`);
    }
  }

  async listAllChaosExperiments(namespace: string): Promise<any> {
    try {
      const allExperiments: any[] = [];
      const chaosTypes = [
        ChaosType.POD_FAILURE,
        ChaosType.POD_KILL,
        ChaosType.CONTAINER_KILL,
        ChaosType.NETWORK_DELAY,
        ChaosType.NETWORK_LOSS,
        ChaosType.NETWORK_BANDWIDTH,
        ChaosType.NETWORK_PARTITION,
        ChaosType.CPU_STRESS,
        ChaosType.MEMORY_STRESS,
        ChaosType.IO_STRESS,
      ];

      for (const type of chaosTypes) {
        try {
          const result = await this.listChaosExperiments(type, namespace);
          if (result && result.items) {
            allExperiments.push(...result.items.map((item: any) => ({
              ...item,
              chaosType: type,
            })));
          }
        } catch (error) {
          
          this.logger.warn(`Failed to list experiments of type ${type}: ${error.message}`);
        }
      }

      return { items: allExperiments };
    } catch (error) {
      this.logger.error(`Error listing all chaos experiments in namespace ${namespace}:`, error);
      throw new BadRequestException(`Failed to list all chaos experiments: ${error.message}`);
    }
  }

  async scheduleChaosExperiment(scheduleDto: ChaosExperimentScheduleDto): Promise<any> {
    const { experiment, startDelay, endDelay } = scheduleDto;
    
    try {
      
      const experimentName = experiment.name || `chaos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let chaosResource: any;

      switch (experiment.type) {
        case ChaosType.POD_FAILURE:
          chaosResource = this.createPodChaos(experimentName, experiment, 'pod-failure');
          break;
        case ChaosType.POD_KILL:
          chaosResource = this.createPodChaos(experimentName, experiment, 'pod-kill');
          break;
        case ChaosType.CONTAINER_KILL:
          chaosResource = this.createPodChaos(experimentName, experiment, 'container-kill');
          break;
        case ChaosType.NETWORK_DELAY:
          chaosResource = this.createNetworkChaos(experimentName, experiment, 'delay');
          break;
        case ChaosType.NETWORK_LOSS:
          chaosResource = this.createNetworkChaos(experimentName, experiment, 'loss');
          break;
        case ChaosType.NETWORK_BANDWIDTH:
          chaosResource = this.createNetworkChaos(experimentName, experiment, 'bandwidth');
          break;
        case ChaosType.NETWORK_PARTITION:
          chaosResource = this.createNetworkChaos(experimentName, experiment, 'partition');
          break;
        case ChaosType.CPU_STRESS:
          chaosResource = this.createStressChaos(experimentName, experiment, 'cpu');
          break;
        case ChaosType.MEMORY_STRESS:
          chaosResource = this.createStressChaos(experimentName, experiment, 'memory');
          break;
        case ChaosType.IO_STRESS:
          chaosResource = this.createStressChaos(experimentName, experiment, 'io');
          break;
        default:
          throw new BadRequestException(`Unsupported chaos type: ${experiment.type}`);
      }

      if (startDelay || endDelay) {
        if (!chaosResource.metadata.annotations) {
          chaosResource.metadata.annotations = {};
        }
        if (startDelay) {
          chaosResource.metadata.annotations['chaos-mesh.org/start-delay'] = startDelay;
        }
        if (endDelay) {
          chaosResource.metadata.annotations['chaos-mesh.org/end-delay'] = endDelay;
        }
      }

      if (experiment.experimentId) {
        if (!chaosResource.metadata.labels) {
          chaosResource.metadata.labels = {};
        }
        chaosResource.metadata.labels['chaos-mesh.org/experiment'] = experiment.experimentId;
        chaosResource.metadata.labels['app'] = 'chaos-experiment';
      }

      const result = await this.customApi.createNamespacedCustomObject({
        group: this.chaosGroup,
        version: this.chaosVersion,
        namespace: experiment.namespace,
        plural: this.getPluralName(experiment.type),
        body: chaosResource,
      });

      this.logger.log(`Scheduled chaos experiment ${experimentName} in namespace ${experiment.namespace}`);
      return { 
        name: experimentName, 
        namespace: experiment.namespace, 
        type: experiment.type, 
        startDelay,
        endDelay,
        result 
      };
    } catch (error) {
      this.logger.error(`Error scheduling chaos experiment:`, error);
      throw new BadRequestException(`Failed to schedule chaos experiment: ${error.message}`);
    }
  }

  async pauseChaosExperiment(type: ChaosType, namespace: string, name: string): Promise<any> {
    try {
      const experiment = await this.getChaosExperimentStatus(type, namespace, name);
      
      if (!experiment.metadata.annotations) {
        experiment.metadata.annotations = {};
      }
      
      experiment.metadata.annotations['chaos-mesh.org/pause'] = 'true';
      
      const result = await this.customApi.replaceNamespacedCustomObject({
        group: this.chaosGroup,
        version: this.chaosVersion,
        namespace,
        plural: this.getPluralName(type),
        name,
        body: experiment,
      });

      this.logger.log(`Chaos experiment ${name} paused in namespace ${namespace}`);
      return result.body;
    } catch (error) {
      this.logger.error(`Error pausing chaos experiment ${name}:`, error);
      throw new BadRequestException(`Failed to pause chaos experiment: ${error.message}`);
    }
  }

  async resumeChaosExperiment(type: ChaosType, namespace: string, name: string): Promise<any> {
    try {
      const experiment = await this.getChaosExperimentStatus(type, namespace, name);
      
      if (!experiment.metadata.annotations) {
        experiment.metadata.annotations = {};
      }
      
      delete experiment.metadata.annotations['chaos-mesh.org/pause'];
      
      const result = await this.customApi.replaceNamespacedCustomObject({
        group: this.chaosGroup,
        version: this.chaosVersion,
        namespace,
        plural: this.getPluralName(type),
        name,
        body: experiment,
      });

      this.logger.log(`Chaos experiment ${name} resumed in namespace ${namespace}`);
      return result.body;
    } catch (error) {
      this.logger.error(`Error resuming chaos experiment ${name}:`, error);
      throw new BadRequestException(`Failed to resume chaos experiment: ${error.message}`);
    }
  }

  private createPodChaos(name: string, dto: CreateChaosExperimentDto, action: string): any {
    const mode = dto.mode || ChaosMode.ONE;
    const value = dto.value || (mode === ChaosMode.ONE ? undefined : 1);

    const metadata: any = {
      name,
      namespace: dto.namespace,
    };

    if (dto.experimentId) {
      metadata.labels = {
        'chaos-mesh.org/experiment': dto.experimentId,
        'app': 'chaos-experiment',
      };
    }

    return {
      apiVersion: `${this.chaosGroup}/${this.chaosVersion}`,
      kind: 'PodChaos',
      metadata,
      spec: {
        action,
        mode,
        
        ...(value !== undefined && { value: String(value) }),
        duration: dto.duration,
        selector: {
          namespaces: [dto.namespace],
          labelSelectors: dto.selector,
        },
      },
    };
  }

  private createNetworkChaos(name: string, dto: CreateChaosExperimentDto, action: string): any {
    const mode = dto.mode || ChaosMode.ALL;
    const value = dto.value || (mode === ChaosMode.ALL ? undefined : 1);

    const spec: any = {
      action,
      mode,
      
      ...(value !== undefined && { value: String(value) }),
      duration: dto.duration,
      selector: {
        namespaces: [dto.namespace],
        labelSelectors: dto.selector,
      },
    };

    if (action === 'delay' && dto.networkDelay) {

      const formatDuration = (value: string): string => {
        if (!value) return value;
        
        const validUnits = ['ns', 'us', 'ms', 's', 'm', 'h'];
        const hasUnit = validUnits.some(unit => value.toLowerCase().endsWith(unit));
        if (hasUnit) {
          return value;
        }
        
        return `${value}ms`;
      };

      spec.delay = {
        latency: formatDuration(dto.networkDelay.latency),
        ...(dto.networkDelay.jitter && { jitter: formatDuration(dto.networkDelay.jitter) }),
        ...(dto.networkDelay.correlation && { correlation: dto.networkDelay.correlation }),
      };
    } else if (action === 'loss' && dto.networkLoss) {
      spec.loss = {
        loss: dto.networkLoss.loss,
        ...(dto.networkLoss.correlation && { correlation: dto.networkLoss.correlation }),
      };
    } else if (action === 'bandwidth' && dto.networkBandwidth) {
      spec.bandwidth = {
        rate: dto.networkBandwidth.rate,
      };
    }

    const metadata: any = {
      name,
      namespace: dto.namespace,
    };

    if (dto.experimentId) {
      metadata.labels = {
        'chaos-mesh.org/experiment': dto.experimentId,
        'app': 'chaos-experiment',
      };
    }

    return {
      apiVersion: `${this.chaosGroup}/${this.chaosVersion}`,
      kind: 'NetworkChaos',
      metadata,
      spec,
    };
  }

  private createStressChaos(name: string, dto: CreateChaosExperimentDto, stressorType: string): any {
    if (!dto.stress) {
      throw new BadRequestException(`Stress specification is required for ${dto.type}`);
    }

    const mode = dto.mode || ChaosMode.ONE;
    const value = dto.value || (mode === ChaosMode.ONE ? undefined : 1);

    const stressors: any = {};
    stressors[stressorType] = {
      workers: dto.stress.workers,
      load: dto.stress.load,
      ...(dto.stress.duration && { duration: dto.stress.duration }),
    };

    const metadata: any = {
      name,
      namespace: dto.namespace,
    };

    if (dto.experimentId) {
      metadata.labels = {
        'chaos-mesh.org/experiment': dto.experimentId,
        'app': 'chaos-experiment',
      };
    }

    return {
      apiVersion: `${this.chaosGroup}/${this.chaosVersion}`,
      kind: 'StressChaos',
      metadata,
      spec: {
        mode,
        
        ...(value !== undefined && { value: String(value) }),
        duration: dto.duration,
        selector: {
          namespaces: [dto.namespace],
          labelSelectors: dto.selector,
        },
        stressors,
      },
    };
  }

  private async verifyCRDExists(plural: string): Promise<void> {
    try {

      await this.customApi.listClusterCustomObject({
        group: this.chaosGroup,
        version: this.chaosVersion,
        plural: plural,
        limit: 1, 
      });
      this.logger.debug(`✅ CRD verified: ${this.chaosGroup}/${this.chaosVersion}/${plural}`);
    } catch (error) {
      if (error.statusCode === 404) {
        this.logger.error(`❌ CRD not found: ${this.chaosGroup}/${this.chaosVersion}/${plural}`);
        throw new BadRequestException(
          `Chaos Mesh CRD not found for resource type: ${plural}\n` +
          `Please ensure Chaos Mesh is installed by running: make setup-chaos-mesh\n` +
          `Or verify installation with: kubectl get crd | grep chaos-mesh`
        );
      }

      this.logger.warn(`⚠️ Could not verify CRD ${plural}: ${error.message}`);
    }
  }

  private getPluralName(type: ChaosType): string {
    const pluralMap: Record<ChaosType, string> = {
      [ChaosType.POD_FAILURE]: 'podchaos', 
      [ChaosType.POD_KILL]: 'podchaos',
      [ChaosType.CONTAINER_KILL]: 'podchaos',
      [ChaosType.NETWORK_PARTITION]: 'networkchaos',
      [ChaosType.NETWORK_DELAY]: 'networkchaos',
      [ChaosType.NETWORK_LOSS]: 'networkchaos',
      [ChaosType.NETWORK_BANDWIDTH]: 'networkchaos',
      [ChaosType.CPU_STRESS]: 'stresschaos',
      [ChaosType.MEMORY_STRESS]: 'stresschaos',
      [ChaosType.IO_STRESS]: 'stresschaos',
    };
    return pluralMap[type] || 'chaos';
  }

  async deleteChaosExperimentsByExperimentId(experimentId: string, namespace: string): Promise<void> {
    try {
      const chaosTypes = [
        ChaosType.POD_FAILURE,
        ChaosType.POD_KILL,
        ChaosType.CONTAINER_KILL,
        ChaosType.NETWORK_DELAY,
        ChaosType.NETWORK_LOSS,
        ChaosType.NETWORK_BANDWIDTH,
        ChaosType.NETWORK_PARTITION,
        ChaosType.CPU_STRESS,
        ChaosType.MEMORY_STRESS,
        ChaosType.IO_STRESS,
      ];

      const deletePromises: Promise<void>[] = [];

      for (const type of chaosTypes) {
        try {
          const result = await this.listChaosExperiments(type, namespace);
          if (result && result.items) {
            for (const item of result.items) {
              
              if (item.metadata?.labels?.['chaos-mesh.org/experiment'] === experimentId) {
                deletePromises.push(
                  this.deleteChaosExperiment(type, namespace, item.metadata.name)
                    .catch(error => {
                      this.logger.warn(`Failed to delete chaos experiment ${item.metadata.name}: ${error.message}`);
                    })
                );
              }
            }
          }
        } catch (error) {
          
          this.logger.warn(`Failed to list experiments of type ${type}: ${error.message}`);
        }
      }

      await Promise.allSettled(deletePromises);
      this.logger.log(`Deleted chaos experiments associated with experiment ID ${experimentId} in namespace ${namespace}`);
    } catch (error) {
      this.logger.error(`Error deleting chaos experiments by experiment ID ${experimentId}:`, error);
      throw new BadRequestException(`Failed to delete chaos experiments: ${error.message}`);
    }
  }
}

