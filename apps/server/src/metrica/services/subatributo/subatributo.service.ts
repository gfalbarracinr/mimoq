import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AtributoService } from '../atributo/atributo.service';
import { Subatributo } from '../../entities/subatributo.entity';
import { CreateSubatributoDto } from '../../dtos/subatributo.dto';

@Injectable()
export class SubatributoService {
  constructor(
    @InjectRepository(Subatributo)
    private subatributoRepo: Repository<Subatributo>,
    private atributoService: AtributoService
  ) { }

  async find() {
    try {
      return await this.subatributoRepo.find();
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando los subatributos: ${error}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const subatributo = await this.subatributoRepo.findOne({
        where: { id_subatributo: id },
      });
      if (!(subatributo instanceof Subatributo)) {
        throw new NotFoundException(
          `Subatributo con #${id} no se encuentra en la Base de Datos`,
        );
      }
      return subatributo;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando el subatributo por id: ${error}`,
      );
    }
  }

  async findOneByName(nombre: string) {
    try {
      const subatributo = await this.subatributoRepo.findOne({
        where: { nombre: nombre },
        relations: ['metricas'],
      });
      if (!subatributo) {
        throw new NotFoundException(
          `Subatributo "${nombre}" no se encuentra en la Base de Datos`,
        );
      }
      return subatributo;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando el subatributo por nombre: ${error}`,
      );
    }
  }

  async createSubatributo(data: CreateSubatributoDto) {
    try {
      const newSubatributo = this.subatributoRepo.create(data);

      if (data.fk_id_atributo) {
        const atributo = await this.atributoService.findOne(data.fk_id_atributo)
        newSubatributo.atributo = atributo;
      }

      return this.subatributoRepo.save(newSubatributo);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas creando el subatributo: ${error}`,
      );
    }
  }
}
