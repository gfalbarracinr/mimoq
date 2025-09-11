import { ApiProperty, PartialType } from '@nestjs/swagger';

import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
export class CreateExperimentoDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  readonly nombre: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  readonly duracion: string;
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  readonly cant_replicas: number;
  @IsNotEmpty()
  @IsArray()
  @ApiProperty()
  readonly endpoints: string[];
  @IsOptional()
  @IsArray()
  @ApiProperty()
  readonly iframes: string[];
  @IsNotEmpty({ message: 'Las FKs de los despliegues son obligatorios' })
  @IsNumber({}, {each: true})
  @ApiProperty()
  readonly fk_ids_despliegues: number[];
  @IsNotEmpty({ message: 'Las FKs de las métricas son obligatorias' })
  @IsNumber({}, {each: true})
  @ApiProperty()
  readonly fk_ids_metricas: number[];
  @IsNotEmpty({ message: 'El FK de la carga es obligatoria' })
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  readonly fk_id_carga: number;
}

export class UpdateExperimentoDto extends PartialType(CreateExperimentoDto) {}
