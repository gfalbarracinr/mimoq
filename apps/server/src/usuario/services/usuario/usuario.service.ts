import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from '../../entities/usuario.entity';
import { RolUsuarioService } from '../rol-usuario/rol-usuario.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from '../../dtos/usuario.dto';

@Injectable()
export class UsuarioService {
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
      console.error(error);
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
      console.error(error);
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
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando el usuario dado el correo: ${error}`,
      );
    }
  }

  async createUser(data: CreateUsuarioDto) {
    console.log("entra aca")
    try {
      const userExits = await this.findOneByEmail(data.correo);
      console.log("user ", userExits)
      if (userExits instanceof Usuario) {
        throw new InternalServerErrorException(
          `Este usuario ya se encuentra registrado en la BD`,
        );
      }
      console.log("about to create user", data)
      const newUser = this.usuarioRepo.create(data);
      console.log("user created ", newUser)
      const hashPassword = await bcrypt.hash(newUser.contrasena, 10);
      console.log("password ", hashPassword)
      newUser.contrasena = hashPassword;

      if (data.fk_id_rol_usuario) {
        const rol = await this.rolUsuarioService.findOne(data.fk_id_rol_usuario);
        newUser.rol = rol;
      }

      console.log('about to save the new user', newUser)

      return this.usuarioRepo.save(newUser);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas creando el usuario: ${error}`,
      );
    }
  }

  async updateUser(id: number, cambios: UpdateUsuarioDto) {
    try {
      const user = await this.usuarioRepo.findOneBy({ id_usuario: id });
      if (cambios.fk_id_rol_usuario) {
        const rol = await this.rolUsuarioService.findOne(cambios.fk_id_rol_usuario);
        user.rol = rol;
      }
      this.usuarioRepo.merge(user, cambios);
      return this.usuarioRepo.save(user);
    } catch (error) {
      console.error(error);
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
