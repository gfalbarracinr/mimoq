export enum ChaosType {
  POD_FAILURE = 'pod-failure',
  POD_KILL = 'pod-kill',
  CONTAINER_KILL = 'container-kill',
  NETWORK_PARTITION = 'network-partition',
  NETWORK_DELAY = 'network-delay',
  NETWORK_LOSS = 'network-loss',
  NETWORK_BANDWIDTH = 'network-bandwidth',
  CPU_STRESS = 'cpu-stress',
  MEMORY_STRESS = 'memory-stress',
  IO_STRESS = 'io-stress',
}

export enum ChaosMode {
  ONE = 'one',
  ALL = 'all',
  FIXED = 'fixed',
  FIXED_PERCENT = 'fixed-percent',
  RANDOM_MAX_PERCENT = 'random-max-percent',
}

export interface NetworkDelaySpec {
  latency: string;
  jitter?: string;
  correlation?: string;
}

export interface NetworkLossSpec {
  loss: string;
  correlation?: string;
}

export interface NetworkBandwidthSpec {
  rate: string;
}

export interface StressSpec {
  workers: number;
  load: number;
  duration: string;
}

export interface CreateChaosExperimentDto {
  type: ChaosType;
  namespace: string;
  selector: Record<string, string>;
  mode?: ChaosMode;
  value?: number;
  duration: string;
  networkDelay?: NetworkDelaySpec;
  networkLoss?: NetworkLossSpec;
  networkBandwidth?: NetworkBandwidthSpec;
  stress?: StressSpec;
  name?: string;
  experimentId?: string;
}

export interface ChaosExperimentScheduleDto {
  experiment: CreateChaosExperimentDto;
  startDelay?: string;
  endDelay?: string;
}

