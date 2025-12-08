import { Module } from '@nestjs/common';
import { ProyectoService } from './services/proyecto/proyecto.service';
import { ProyectoController } from './controllers/proyecto/proyecto.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proyecto } from './entities/proyecto.entity';
import { Despliegue } from './entities/despliegue.entity';
import { DespliegueIndividualService } from './services/despliegue-individual/despliegue-individual.service';
import { DespliegueMultipleService } from './services/despliegue-multiple/despliegue-multiple.service';
import { DespliegueController } from './controllers/despliegue/despliegue.controller';
import { DespliegueService } from './services/despliegue/despliegue.service';
import { Usuario } from '../usuario/entities/usuario.entity';
import { RolUsuario } from '../usuario/entities/rol-usuario.entity';
import { UsuarioService } from '../usuario/services/usuario/usuario.service';
import { RolUsuarioService } from '../usuario/services/rol-usuario/rol-usuario.service';
import { KubernetesModule } from '../kubernetes/kubernetes.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proyecto,
      Despliegue,
      Usuario,
      RolUsuario
    ]),
    KubernetesModule],
  providers: [
    ProyectoService,
    DespliegueService,
    DespliegueIndividualService,
    DespliegueMultipleService,
    UsuarioService,
    RolUsuarioService
  ],
  controllers: [ProyectoController, DespliegueController],
  exports: [DespliegueService]
})
export class ProyectoModule { }
