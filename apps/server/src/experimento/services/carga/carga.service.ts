import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carga } from '../../entities/carga.entity';
import { CreateCargaDto, UpdateCargaDto } from '../../dtos/carga.dto';

@Injectable()
export class CargaService {
    constructor(
        @InjectRepository(Carga)
        private cargaRepo: Repository<Carga>,
    ) { }

    async findAll() {
        try {
            return await this.cargaRepo.find({});
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas encontrando las cargas: ${error}`,
            );
        }
    }

    async findOne(id: number) {
        try {
            const carga = await this.cargaRepo.findOneBy({ id_carga: id });
            if (!(carga instanceof Carga)) {
                throw new NotFoundException(
                    `Carga con id #${id} no se encuentra en la Base de Datos`,
                );
            }
            return carga;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas encontrando la carga por id: ${error}`,
            );
        }
    }

    async createCarga(data: CreateCargaDto) {
        try {
            const newCarga = this.cargaRepo.create(data);
            return this.cargaRepo.save(newCarga);
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas creando la carga: ${error}`,
            );
        }
    }

    async updateCarga(id: number, cambios: UpdateCargaDto) {
        try {
            const carga = await this.cargaRepo.findOneBy({ id_carga: id });
            this.cargaRepo.merge(carga, cambios);
            return this.cargaRepo.save(carga);
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(
                `Problemas actualizando el experimento: ${error}`,
            );
        }
    }

    removeCarga(id: number) {
        return this.cargaRepo.delete(id);
    }
}
