import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubatributoService } from '../subatributo/subatributo.service';
import { Metrica } from '../../entities/metrica.entity';
import { CreateMetricaDto } from '../../dtos/metrica.dto';

@Injectable()
export class MetricaService {
  constructor(
    @InjectRepository(Metrica)
    private metricaRepo: Repository<Metrica>,
    private subatributoService: SubatributoService,
  ) { }

  async find() {
    try {
      return await this.metricaRepo.find();
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando las metricas: ${error}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const metrica = await this.metricaRepo.findOne({
        where: { id_metrica: id },
      });
      if (!(metrica instanceof Metrica)) {
        throw new NotFoundException(
          `Metrica con #${id} no se encuentra en la Base de Datos`,
        );
      }
      return metrica;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando la metrica por id: ${error}`,
      );
    }
  }

  async findOneByName(nombre: string) {
    try {
      const metrica = await this.metricaRepo.findOne({
        where: { nombre: nombre }
      });
      return metrica;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas encontrando la metrica por nombre: ${error}`,
      );
    }
  }

  async createMetrica(data: CreateMetricaDto) {
    try {
      // const metrica = await this.findOneByName(data.nombre);

      // if (metrica) throw new BadRequestException(
      //     `Metrica "${data.nombre}" ya se encuentra registrada en la Base de Datos`,
      // );

      const newMetrica = this.metricaRepo.create(data);

      if (data.fk_id_subatributo) {
        const subatributo = await this.subatributoService.findOne(data.fk_id_subatributo);
        newMetrica.subatributo = subatributo;
      }

      return this.metricaRepo.save(newMetrica);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `Problemas creando la metrica: ${error}`,
      );
    }
  }
}
