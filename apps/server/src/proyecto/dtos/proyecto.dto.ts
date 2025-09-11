import { ApiProperty, PartialType } from '@nestjs/swagger';

import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @ApiProperty()
  readonly nombre: string;
  @IsOptional()
  @IsString()
  @ApiProperty()
  readonly descripcion: string;
  @IsOptional()
  @IsString()
  @ApiProperty()
  readonly url_repositorio: string;
  @IsOptional()
  @IsArray()
  @ApiProperty()
  readonly urls_repositorios: string[];
  @IsOptional()
  @IsArray()
  @ApiProperty()
  readonly nombres_microservicios: string[];
  @IsNotEmpty({ message: 'Contiene docker compose es obligatorio' })
  @IsBoolean()
  @ApiProperty()
  readonly docker_compose: boolean;
  @IsNotEmpty({ message: 'Contiene dockerfile es obligatorio' })
  @IsBoolean()
  @ApiProperty()
  readonly dockerfile: boolean;
  @IsNotEmpty({ message: 'El FK del usuario es obligatorio' })
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  readonly fk_usuario: number;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
