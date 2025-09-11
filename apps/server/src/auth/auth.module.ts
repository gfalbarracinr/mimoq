import { Module } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from './controllers/auth/auth.controller';
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsuarioModule } from "../usuario/usuario.module";
import { Usuario } from "../usuario/entities/usuario.entity";
import { RolUsuario } from "../usuario/entities/rol-usuario.entity";
import config from "../config";
import { AuthService } from "./services/auth/auth.service";
import { UsuarioService } from "../usuario/services/usuario/usuario.service";
import { RolUsuarioService } from "../usuario/services/rol-usuario/rol-usuario.service";

@Module({
    imports: [
      UsuarioModule,
      PassportModule,
      TypeOrmModule.forFeature([
        Usuario,
        RolUsuario
      ]),
      JwtModule.registerAsync({
        inject: [config.KEY],
        useFactory: (configService: ConfigType<typeof config>) => {
          return {
            secret: configService.jwtSecret,
            signOptions: {
              expiresIn: '1h',
            },
          };
        },
      }),
    ],
    providers: [AuthService, LocalStrategy, JwtStrategy, UsuarioService, RolUsuarioService],
    controllers: [AuthController],
  })
  export class AuthModule {}
