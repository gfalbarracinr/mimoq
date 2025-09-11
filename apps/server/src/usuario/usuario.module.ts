import { Module } from '@nestjs/common';
import { UsuarioController } from './controllers/usuario/usuario.controller';
import { UsuarioService } from './services/usuario/usuario.service';
import { Usuario } from './entities/usuario.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolUsuarioService } from './services/rol-usuario/rol-usuario.service';
import { RolUsuarioController } from './controllers/rol-usuario/rol-usuario.controller';
import { RolUsuario } from './entities/rol-usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      RolUsuario
    ]),
  ],
  controllers: [UsuarioController, RolUsuarioController],
  providers: [UsuarioService, RolUsuarioService],
  exports: [UsuarioService, RolUsuarioService]
})
export class UsuarioModule {}
