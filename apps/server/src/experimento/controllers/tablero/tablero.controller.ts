import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TableroService } from '../../services/tablero/tablero.service';

@ApiTags('Tablero')
@Controller('tablero')
export class TableroController {
  constructor(
    private tableroService: TableroService,
  ) { }

  @Get('descargar/:nombre_experimento/:nombre_despliegue')
  descargarArchivo(@Param('nombre_experimento') nombre_experimento: string, @Param('nombre_despliegue') nombre_despliegue: string) {
    // return this.tableroService.loadDashboard(nombre_experimento, nombre_despliegue);
  }
}
