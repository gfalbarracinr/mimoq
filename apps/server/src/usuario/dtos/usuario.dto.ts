import { ApiProperty, PartialType } from '@nestjs/swagger';

import {
    IsNotEmpty,
    IsNumber,
    IsPositive,
    IsString,
} from 'class-validator';

export class CreateUsuarioDto {
    @IsNotEmpty({message: 'El nombre es obligatorio'})
    @IsString()
    @ApiProperty()
    readonly nombre: string;
    @IsNotEmpty({message: 'El correo es obligatorio'})
    @IsString()
    @ApiProperty()
    readonly correo: string;
    @IsNotEmpty({message: 'El número de documento es obligatorio'})
    @IsNumber()
    @ApiProperty()
    readonly documento: number;
    @IsNotEmpty({message: 'La contraseña es obligatoria'})
    @IsString()
    @ApiProperty()
    readonly contrasena: string;
    @IsNotEmpty({message: 'El FK del rol es obligatorio'})
    @IsNumber()
    @IsPositive()
    @ApiProperty()
    readonly fk_id_rol_usuario: number;
}

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
