import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CargaService } from '../../services/carga/carga.service';
import { CreateCargaDto, UpdateCargaDto } from '../../dtos/carga.dto';
import { K6Service } from '../../../k6/k6.service';

@ApiTags('Carga')
@Controller('carga')
export class CargaController {
    constructor(
        private cargaService: CargaService,
        private k6Service: K6Service,
    ) { }

    @Get()
    findAll() {
        return this.cargaService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.cargaService.findOne(id);
    }

    @Post()
    createCarga(@Body() payload: CreateCargaDto) {
        console.log('Body en controller', payload);
        return this.cargaService.createCarga(payload);
    }

    @Post('experimento')
    createExperiment(@Body() payload: any) {
        console.log('Body en controller', payload);
        try {
            return this.cargaService.executeExperiment(payload);
        } catch (error) {
            console.error(error);
            return { message: 'Error al ejecutar el experimento' , error: error.message, status: 400 };
        }
    }
    
    @Put(':id')
    updateCarga(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateCargaDto,
    ) {
        return this.cargaService.updateCarga(id, payload);
    }

    @Delete(':id')
    removeCarga(@Param('id', ParseIntPipe) id: number) {
        return this.cargaService.removeCarga(id);
    }
}
