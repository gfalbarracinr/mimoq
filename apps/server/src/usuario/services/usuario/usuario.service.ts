import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from '../../entities/usuario.entity';
import { RolUsuarioService } from '../rol-usuario/rol-usuario.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from '../../dtos/usuario.dto';

@Injectable()
export class UsuarioService {
  private readonly logger = new Logger(UsuarioService.name);

  constructor(
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
    private rolUsuarioService: RolUsuarioService,
  ) { }

  async findAll() {
    try {
      return await this.usuarioRepo.find({
        relations: ['proyectos', 'proyectos.despliegues'],
      });
    } catch (error) {
      this.logger.error("Error in findAll:", error);
      throw new InternalServerErrorException(
        `Problemas encontrando los usuarios: ${error}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.usuarioRepo.findOne({
        where: { id_usuario: id },
        relations: ['proyectos', 'proyectos.despliegues'],
      });
      if (!(user instanceof Usuario)) {
        throw new NotFoundException(
          `Usuario con id #${id} no se encuentra en la Base de Datos`,
        );
      }
      return user;
    } catch (error) {
      this.logger.error("Error in findOne:", error);
      throw new InternalServerErrorException(
        `Problemas encontrando a un usuario por id: ${error}`,
      );
    }
  }

  async findOneByEmail(correo_cor: string) {
    try {
      const user = await this.usuarioRepo.findOne({
        where: { correo: correo_cor },
        relations: ['rol', 'proyectos', 'proyectos.despliegues'],
      });
      return user;
    } catch (error) {
      this.logger.error("Error in findOneByEmail:", error);
      throw new InternalServerErrorException(
        `Problemas encontrando el usuario dado el correo: ${error}`,
      );
    }
  }

  async createUser(data: CreateUsuarioDto) {
    this.logger.debug("Starting user creation process")
    try {
      const userExits = await this.findOneByEmail(data.correo);
      this.logger.debug("User exists check result:", userExits)
      if (userExits instanceof Usuario) {
        throw new InternalServerErrorException(
          `Este usuario ya se encuentra registrado en la BD`,
        );
      }
      this.logger.debug("About to create user with data:", data)
      const newUser = this.usuarioRepo.create(data);
      
      this.logger.log("Validando contraseña del usuario")
      // Validar que la contraseña existe
      if (!newUser.contrasena) {
        this.logger.warn("La contraseña es requerida")
        throw new InternalServerErrorException('La contraseña es requerida');
      }
      
      this.logger.debug("Password validation passed, about to hash password:", newUser.contrasena?.substring(0, 3) + "...")
      
      try {
        this.logger.debug("Starting bcrypt.hash operation...")
        const hashPassword = await bcrypt.hash(newUser.contrasena, 10);
        this.logger.debug("Password hashed successfully, hash length:", hashPassword.length)
        newUser.contrasena = hashPassword;
      } catch (hashError) {
        this.logger.error("Error hashing password:", hashError);
        this.logger.error("Hash error details:", {
          message: hashError.message,
          stack: hashError.stack,
          name: hashError.name
        });
        throw new InternalServerErrorException(`Error al hashear la contraseña: ${hashError.message}`);
      }

      if (data.fk_id_rol_usuario) {
        this.logger.debug('Looking for role with ID:', data.fk_id_rol_usuario);
        try {
          const rol = await this.rolUsuarioService.findOne(data.fk_id_rol_usuario);
          this.logger.debug('Role found:', rol);
          newUser.rol = rol;
        } catch (roleError) {
          this.logger.warn('Role not found, creating default role:', roleError.message);
          this.logger.debug('Using default role for user creation');
          throw new InternalServerErrorException('Rol no encontrado');
        }
      }

      this.logger.debug('About to save the new user:', newUser)

      return this.usuarioRepo.save(newUser);
    } catch (error) {
      this.logger.error("Error in createUser:", error);
      throw new InternalServerErrorException(
        `Problemas creando el usuario: ${error}`,
      );
    }
  }

  async updateUser(id: number, cambios: UpdateUsuarioDto) {
    try {
      const user = await this.usuarioRepo.findOneBy({ id_usuario: id });
      if (!user) {
        throw new InternalServerErrorException(`Usuario con id ${id} no encontrado`);
      }

      // Manejo seguro del rol
      if ('fk_id_rol_usuario' in cambios && cambios.fk_id_rol_usuario) {
        const rol = await this.rolUsuarioService.findOne((cambios as any).fk_id_rol_usuario);
        if (!rol) {
          throw new InternalServerErrorException(`Rol con id ${(cambios as any).fk_id_rol_usuario} no encontrado`);
        }
        user.rol = rol;
        // Omitir merge del campo fk_id_rol_usuario para prevenir error de propiedad inexistente
        const { fk_id_rol_usuario, ...rest } = cambios as any;
        this.usuarioRepo.merge(user, rest);
      } else {
        this.usuarioRepo.merge(user, cambios);
      }
      return this.usuarioRepo.save(user);
    } catch (error) {
      this.logger.error("Error in updateUser:", error);
      throw new InternalServerErrorException(
        `Problemas actualizando el usuario: ${error}`,
      );
    }
  }

  async updatePassword(id: number, psdActual: string, psdNew: string) {
    const user = await this.usuarioRepo.findOneBy({ id_usuario: id });
    if (!(user instanceof Usuario)) {
      throw new NotFoundException(
        `Usuario no encontrado para actualizar contraseña`,
      );
    }
    const isMatch = await bcrypt.compare(psdActual, user.contrasena);
    if (!isMatch) {
      throw new InternalServerErrorException(
        `Problemas actualizando la contraseña`,
      );
    }
    const hashPassword = await bcrypt.hash(psdNew, 10);
    user.contrasena = hashPassword;
    return this.usuarioRepo.save(user);
  }


  removeUser(id: number) {
    return this.usuarioRepo.delete(id);
  }
}
