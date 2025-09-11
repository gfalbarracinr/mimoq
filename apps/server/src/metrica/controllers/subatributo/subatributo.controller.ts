import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubatributoService } from '../../services/subatributo/subatributo.service';
import { CreateSubatributoDto } from '../../dtos/subatributo.dto';

@ApiTags('Subatributo')
@Controller('subatributo')
export class SubatributoController {
    constructor(private subatributoService: SubatributoService) { }

    @Get()
    find() {
        return this.subatributoService.find();
    }

    @Get(':nombre')
    findOneByName(@Param('nombre') nombre: string) {
        return this.subatributoService.findOneByName(nombre);
    }

    @Post()
    createSubatributo(@Body() payload: CreateSubatributoDto) {
        return this.subatributoService.createSubatributo(payload);
    }
}

