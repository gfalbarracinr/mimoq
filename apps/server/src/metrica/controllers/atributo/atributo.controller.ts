import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AtributoService } from '../../services/atributo/atributo.service';
import { CreateAtributoDto } from '../../dtos/atributo.dto';

@ApiTags('Atributo')
@Controller('atributo')
export class AtributoController {
    constructor(private atributoService: AtributoService) { }

    @Get()
    find() {
        return this.atributoService.find();
    }

    @Get(':nombre')
    findOneByName(@Param('nombre') nombre: string) {
        return this.atributoService.findOneByName(nombre);
    }

    @Post()
    createAtributo(@Body() payload: CreateAtributoDto) {
        return this.atributoService.createAtributo(payload);
    }
}
