import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class NetworkDelaySpec {
  @ApiProperty({ description: 'Delay time in milliseconds', example: 1000 })
  @IsNumber()
  @IsNotEmpty()
  latency: string;

  @ApiProperty({ description: 'Jitter in milliseconds', example: 100, required: false })
  @IsOptional()
  @IsString()
  jitter?: string;

  @ApiProperty({ description: 'Correlation percentage', example: '50', required: false })
  @IsOptional()
  @IsString()
  correlation?: string;
}

export class NetworkLossSpec {
  @ApiProperty({ description: 'Loss percentage', example: '50' })
  @IsString()
  @IsNotEmpty()
  loss: string;

  @ApiProperty({ description: 'Correlation percentage', example: '50', required: false })
  @IsOptional()
  @IsString()
  correlation?: string;
}

export class NetworkBandwidthSpec {
  @ApiProperty({ description: 'Bandwidth limit', example: '1mbps' })
  @IsString()
  @IsNotEmpty()
  rate: string;
}

export class StressSpec {
  @ApiProperty({ description: 'Stress workers count', example: 4 })
  @IsNumber()
  @IsNotEmpty()
  workers: number;

  @ApiProperty({ description: 'Load percentage', example: 80 })
  @IsNumber()
  @IsNotEmpty()
  load: number;

  @ApiProperty({ description: 'Duration in seconds', example: 60 })
  @IsString()
  @IsNotEmpty()
  duration: string;
}

export class CreateChaosExperimentDto {
  @ApiProperty({ description: 'Type of chaos experiment', enum: ChaosType })
  @IsEnum(ChaosType)
  @IsNotEmpty()
  type: ChaosType;

  @ApiProperty({ description: 'Target namespace' })
  @IsString()
  @IsNotEmpty()
  namespace: string;

  @ApiProperty({ description: 'Target pod labels selector', example: { app: 'server' } })
  @IsNotEmpty()
  selector: Record<string, string>;

  @ApiProperty({ description: 'Chaos mode', enum: ChaosMode, default: ChaosMode.ONE })
  @IsEnum(ChaosMode)
  @IsOptional()
  mode?: ChaosMode;

  @ApiProperty({ description: 'Value for fixed/fixed-percent mode', required: false })
  @IsNumber()
  @IsOptional()
  value?: number;

  @ApiProperty({ description: 'Duration of the chaos experiment', example: '30s' })
  @IsString()
  @IsNotEmpty()
  duration: string;

  @ApiProperty({ description: 'Network delay specification', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkDelaySpec)
  networkDelay?: NetworkDelaySpec;

  @ApiProperty({ description: 'Network loss specification', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkLossSpec)
  networkLoss?: NetworkLossSpec;

  @ApiProperty({ description: 'Network bandwidth specification', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkBandwidthSpec)
  networkBandwidth?: NetworkBandwidthSpec;

  @ApiProperty({ description: 'Stress specification', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => StressSpec)
  stress?: StressSpec;

  @ApiProperty({ description: 'Experiment name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'K6 Experiment ID to associate with', required: false })
  @IsString()
  @IsOptional()
  experimentId?: string;
}

export class ChaosExperimentScheduleDto {
  @ApiProperty({ description: 'Chaos experiment configuration' })
  @ValidateNested()
  @Type(() => CreateChaosExperimentDto)
  experiment: CreateChaosExperimentDto;

  @ApiProperty({ description: 'Start delay before chaos (e.g., "10s")', example: '10s' })
  @IsString()
  @IsOptional()
  startDelay?: string;

  @ApiProperty({ description: 'End delay after test ends (e.g., "5s")', example: '5s' })
  @IsString()
  @IsOptional()
  endDelay?: string;
}

