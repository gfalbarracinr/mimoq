import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProyectoService } from '../../services/proyecto/proyecto.service';
import { CreateProjectDto, UpdateProjectDto } from '../../dtos/proyecto.dto';

@ApiTags('Proyecto')
@Controller('proyecto')
export class ProyectoController {
  constructor(
    private proyectoService: ProyectoService,
  ) { }

  @Get()
  findAll() {
    return this.proyectoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proyectoService.findOne(id);
  }

  @Get('usuario/:id')
  findAllByUser(@Param('id', ParseIntPipe) id: number) {
    return this.proyectoService.findAllByUser(id);
  }

  @Post()
  createProject(@Body() payload: CreateProjectDto) {
    console.log('Body en controller', payload);
    return this.proyectoService.createProject(payload);
  }

  @Put(':id')
  updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateProjectDto,
  ) {
    return this.proyectoService.updateProject(id, payload);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.proyectoService.removeProject(id);
  }
}
