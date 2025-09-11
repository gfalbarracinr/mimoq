import { Module } from '@nestjs/common';
import { ExperimentoService } from './services/experimento/experimento.service';
import { ExperimentoController } from './controllers/experimento/experimento.controller';
import { Experimento } from './entities/experimento.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargaController } from './controllers/carga/carga.controller';
import { CargaService } from './services/carga/carga.service';
import { Carga } from './entities/carga.entity';
import { TableroService } from './services/tablero/tablero.service';
import { TableroController } from './controllers/tablero/tablero.controller';
import { Despliegue } from '../proyecto/entities/despliegue.entity';
import { Metrica } from '../metrica/entities/metrica.entity';
import { Atributo } from '../metrica/entities/atributo.entity';
import { Subatributo } from '../metrica/entities/subatributo.entity';
import { DespliegueService } from '../proyecto/services/despliegue/despliegue.service';
import { MetricaService } from '../metrica/services/metrica/metrica.service';
import { AtributoService } from '../metrica/services/atributo/atributo.service';
import { SubatributoService } from '../metrica/services/subatributo/subatributo.service';
import { Proyecto } from '../proyecto/entities/proyecto.entity';
import { RolUsuario } from '../usuario/entities/rol-usuario.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { ProyectoService } from '../proyecto/services/proyecto/proyecto.service';
import { UsuarioService } from '../usuario/services/usuario/usuario.service';
import { RolUsuarioService } from '../usuario/services/rol-usuario/rol-usuario.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Experimento,
      Carga,
      Despliegue,
      Metrica,
      Atributo,
      Subatributo,
      Proyecto,
      Usuario,
      RolUsuario,
    ]),
  ],
  providers: [ExperimentoService, CargaService, DespliegueService, MetricaService, AtributoService, SubatributoService, TableroService, ProyectoService, UsuarioService, RolUsuarioService],
  controllers: [ExperimentoController, CargaController, TableroController],
})
export class ExperimentoModule {}
