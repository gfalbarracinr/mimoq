import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRolUsuarioDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @ApiProperty()
  readonly nombre: string;
}