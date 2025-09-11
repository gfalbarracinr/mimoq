import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateMetricaDto } from '../../dtos/metrica.dto';
import { MetricaService } from '../../services/metrica/metrica.service';

@ApiTags('Metrica')
@Controller('metrica')
export class MetricaController {
    constructor(private metricaService: MetricaService) { }

    @Get()
    find() {
        return this.metricaService.find();
    }

    @Get(':nombre')
    findOneByName(@Param('nombre') nombre: string) {
        return this.metricaService.findOneByName(nombre);
    }

    @Post()
    createMetrica(@Body() payload: CreateMetricaDto) {
        return this.metricaService.createMetrica(payload);
    }
}
