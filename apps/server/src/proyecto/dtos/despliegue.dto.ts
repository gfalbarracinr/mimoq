import { ApiProperty, PartialType } from '@nestjs/swagger';

import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  IsBoolean
} from 'class-validator';

export class CreateDeploymentDto {
  @IsNotEmpty({ message: 'El nombre de la aplicación para Helmes obligatorio' })
  @IsString()
  @ApiProperty()
  readonly nombre_helm: string;
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  @ApiProperty()
  readonly replicas: number[];
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  readonly cant_pods: number;
  @IsNotEmpty({ message: 'El nombre del namespace es obligatorio' })
  @IsString()
  @ApiProperty()
  readonly namespace: string;
  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  autoescalado: boolean;
  @IsOptional()
  @IsNumber()
  @ApiProperty()
  min_replicas: number;
  @IsOptional()
  @IsNumber()
  @ApiProperty()
  max_replicas: number;
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  utilization_cpu: number;
  @IsNotEmpty({ message: 'El FK del proyecto es obligatorio' })
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  readonly fk_proyecto: number;
}

export class UpdateDeploymentDto extends PartialType(CreateDeploymentDto) { }
