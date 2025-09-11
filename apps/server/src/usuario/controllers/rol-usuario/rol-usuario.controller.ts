import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolUsuarioService } from '../../services/rol-usuario/rol-usuario.service';
import { CreateRolUsuarioDto } from '../../dtos/rol-usuario.dto';

@ApiTags('Rol Usuario')
@Controller('rol-usuario')
export class RolUsuarioController {
    constructor(private rolUsuarioService: RolUsuarioService) { }

    @Get()
    find() {
        return this.rolUsuarioService.find();
    }

    @Get(':nombre')
    findOneByName(@Param('nombre') nombre: string) {
        return this.rolUsuarioService.findOneByName(nombre);
    }

    @Post()
    createUsuario(@Body() payload: CreateRolUsuarioDto) {
        return this.rolUsuarioService.createEstadoUsuario(payload);
    }
}
