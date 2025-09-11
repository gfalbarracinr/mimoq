import { Test, TestingModule } from '@nestjs/testing';
import { MetricaController } from './metrica.controller';

describe('MetricaController', () => {
  let controller: MetricaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricaController],
    }).compile();

    controller = module.get<MetricaController>(MetricaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
