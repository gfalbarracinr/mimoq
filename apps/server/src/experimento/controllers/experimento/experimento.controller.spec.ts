import { Test, TestingModule } from '@nestjs/testing';
import { ExperimentoController } from './experimento.controller';

describe('ExperimentoController', () => {
  let controller: ExperimentoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperimentoController],
    }).compile();

    controller = module.get<ExperimentoController>(ExperimentoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
