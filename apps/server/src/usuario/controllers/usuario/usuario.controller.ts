import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsuarioService } from '../../services/usuario/usuario.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from '../../dtos/usuario.dto';

@ApiTags('Usuario')
@Controller('usuario')
export class UsuarioController {
    constructor(
        private usuarioService: UsuarioService,
    ) { }

    @Get()
    findAll() {
        return this.usuarioService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usuarioService.findOne(id);
    }

    @Get('correo/:correo_usuario')
    findOneByEmail(@Param('correo_usuario') correo_usuario: string) {
        return this.usuarioService.findOneByEmail(correo_usuario);
    }

    @Post()
    createUser(@Body() payload: CreateUsuarioDto) {
        console.log('Body en controller', payload);
        return this.usuarioService.createUser(payload);
    }

    @Put(':id/:pssActual/:passNew')
    updatePass(
        @Param('id', ParseIntPipe) id: number,
        @Param('pssActual') pssActual: string,
        @Param('passNew') passNew: string,
    ) {
        return this.usuarioService.updatePassword(id, pssActual, passNew);
    }

    @Put(':id')
    updateUser(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateUsuarioDto,
    ) {
        return this.usuarioService.updateUser(id, payload);
    }

    @Delete(':id')
    removeUser(@Param('id', ParseIntPipe) id: number) {
        return this.usuarioService.removeUser(id);
    }
}
