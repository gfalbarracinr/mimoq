import { Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateExperimentoDto, UpdateExperimentoDto } from '../../dtos/experimento.dto';
import { ExperimentoService } from '../../services/experimento/experimento.service';

import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Experimento')
@Controller('experimento')
export class ExperimentoController {
  constructor(
    private experimentoService: ExperimentoService,
  ) { }

  @Get('descargar/:nombre_carpeta/:nombre_archivo')
  descargarArchivo(@Param('nombre_carpeta') nombre_carpeta: string, @Param('nombre_archivo') nombre_archivo: string, @Res() res: Response) {
    const archivoPath = path.join(__dirname, '../../../../', `utils/resultados-experimentos/${nombre_carpeta}`, nombre_archivo);
    if (fs.existsSync(archivoPath)) {
      
      res.setHeader('Content-Disposition', `attachment; filename=${nombre_archivo}`);
      res.setHeader('Content-Type', 'text/csv');

      const archivoStream = fs.createReadStream(archivoPath);
      archivoStream.pipe(res);
    } else {
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  @Get()
  findAll() {
    return this.experimentoService.findAll();
  }

  @Get(':id/status')
  getStatus(@Param('id', ParseIntPipe) id: number) {
    return this.experimentoService.getExperimentStatus(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.experimentoService.findOne(id);
  }

  @Get('archivos/:id')
  findFiles(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Query('metricas') metricas?: string | string[]
  ) {
    
    let metricasArray: string[] = [];
    if (metricas) {
      metricasArray = Array.isArray(metricas) ? metricas : [metricas];
    }
    return this.experimentoService.findFiles(id, res, metricasArray);
  }

  @Post('dashboard')
  buildDashboard(@Body() payload: CreateExperimentoDto) {
    console.log('Body en controller', payload);
    return this.experimentoService.buildDashboard(payload);
  }

  @Post()
  createExperiment(@Body() payload: CreateExperimentoDto) {
    console.log('Body en controller', payload);
    return this.experimentoService.createExperiment(payload);
  }

  @Put(':id')
  updateExperiment(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateExperimentoDto,
  ) {
    return this.experimentoService.updateExperiment(id, payload);
  }

  @Delete(':id')
  removeExperiment(@Param('id', ParseIntPipe) id: number) {
    return this.experimentoService.removeExperiment(id);
  }

  @Get(':id/check-files')
  async checkFiles(@Param('id', ParseIntPipe) id: number) {
    return this.experimentoService.checkExperimentFiles(id);
  }

  @Post(':id/regenerate-files')
  async regenerateFiles(@Param('id', ParseIntPipe) id: number) {
    return this.experimentoService.regenerateExperimentFiles(id);
  }
}
