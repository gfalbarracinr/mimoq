import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateSubatributoDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @ApiProperty()
  readonly nombre: string;
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @IsString()
  @ApiProperty()
  readonly descripcion: string;
  @IsNotEmpty({message: 'El FK del atributo es obligatorio'})
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  readonly fk_id_atributo: number;
}