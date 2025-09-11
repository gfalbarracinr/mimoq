import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolUsuario } from '../../entities/rol-usuario.entity';
import { CreateRolUsuarioDto } from '../../dtos/rol-usuario.dto';

@Injectable()
export class RolUsuarioService {
    constructor(
        @InjectRepository(RolUsuario)
        private rolUsuarioRepo: Repository<RolUsuario>,
    ) { }

    async find() {
        try {
            return await this.rolUsuarioRepo.find();
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas encontrando los roles de usuario: ${error}`,
            );
        }
    }

    async findOne(id: number) {
        try {
            const rolUsuario = await this.rolUsuarioRepo.findOneBy({ id_rol: id });
            if (!(rolUsuario instanceof RolUsuario)) {
                throw new NotFoundException(
                    `Rol Usuario con #${id} no se encuentra en la Base de Datos`,
                );
            }
            return rolUsuario;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas encontrando el rol de usuario por id: ${error}`,
            );
        }
    }
    async findOneByName(nombre: string) {
        try {
            const estadoUsuario = await this.rolUsuarioRepo.findOne({
                where: { nombre: nombre },
                relations: ['usuarios', 'usuarios.rol'],
            });
            if (!estadoUsuario) {
                throw new NotFoundException(
                    `Usuarios con rol "${nombre}" no se encuentran en la Base de Datos`,
                );
            }
            return estadoUsuario;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas encontrando el rol-usuario por nombre: ${error}`,
            );
        }
    }

    createEstadoUsuario(data: CreateRolUsuarioDto) {
        try {
            const newRolUsuario = this.rolUsuarioRepo.create(data);
            return this.rolUsuarioRepo.save(newRolUsuario);
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas creando el rol de usuario: ${error}`,
            );
        }
    }
}
