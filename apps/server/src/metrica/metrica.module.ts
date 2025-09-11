import { Module } from '@nestjs/common';
import { MetricaService } from './services/metrica/metrica.service';
import { MetricaController } from './controllers/metrica/metrica.controller';
import { AtributoController } from './controllers/atributo/atributo.controller';
import { AtributoService } from './services/atributo/atributo.service';
import { Metrica } from './entities/metrica.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Atributo } from './entities/atributo.entity';
import { SubatributoService } from './services/subatributo/subatributo.service';
import { SubatributoController } from './controllers/subatributo/subatributo.controller';
import { Subatributo } from './entities/subatributo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Metrica,
      Atributo,
      Subatributo
    ])],
  providers: [MetricaService, AtributoService, SubatributoService],
  controllers: [MetricaController, AtributoController, SubatributoController]
})
export class MetricaModule {}
