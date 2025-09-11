import { Test, TestingModule } from '@nestjs/testing';
import { ExperimentoService } from './experimento.service';

describe('ExperimentoService', () => {
  let service: ExperimentoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExperimentoService],
    }).compile();

    service = module.get<ExperimentoService>(ExperimentoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
