import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Atributo } from '../../entities/atributo.entity';
import { CreateAtributoDto } from '../../dtos/atributo.dto';

@Injectable()
export class AtributoService {
  constructor(
    @InjectRepository(Atributo)
    private atributoRepo: Repository<Atributo>,
  ) { }

  async find() {
    try {
      return await this.atributoRepo.find({
        relations: ['subatributos', 'subatributos.metricas']
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando los atributos: ${error}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const atributo = await this.atributoRepo.findOneBy({ id_atributo: id });
      if (!(atributo instanceof Atributo)) {
        throw new NotFoundException(
          `Atributo con #${id} no se encuentra en la Base de Datos`,
        );
      }
      return atributo;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando el atributo por id: ${error}`,
      );
    }
  }

  async findOneByName(nombre: string) {
    try {
      const atributo = await this.atributoRepo.findOne({
        where: { nombre: nombre },
        relations: ['subatributos', 'subatributos.metricas'],
      });
      if (!atributo) {
        throw new NotFoundException(
          `Atributo "${nombre}" no se encuentra en la Base de Datos`,
        );
      }
      return atributo;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando el atributo por nombre: ${error}`,
      );
    }
  }

  async createAtributo(data: CreateAtributoDto) {
    try {
      const newAtributo = this.atributoRepo.create(data);
      return this.atributoRepo.save(newAtributo);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas creando el atributo: ${error}`,
      );
    }
  }
}
