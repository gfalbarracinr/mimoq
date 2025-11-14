import { Module } from '@nestjs/common';
import { ChaosService } from './services/chaos.service';
import { ChaosController } from './controllers/chaos/chaos.controller';
import { KubernetesModule } from '../kubernetes/kubernetes.module';

@Module({
  imports: [KubernetesModule],
  controllers: [ChaosController],
  providers: [ChaosService],
  exports: [ChaosService],
})
export class ChaosModule {}

